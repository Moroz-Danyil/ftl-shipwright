//! Reader for FTL's PKG archive format (`ftl.dat`, used by FTL >= 1.6.1).
//!
//! Format (big-endian throughout):
//!   Header (16 bytes): "PKG\n" (4) + headerSize:u16 (2, must be 16) +
//!     recordSize:u16 (2, must be 20) + entryCount:u32 (4) + pathsRegionSize:u32 (4)
//!   Index: entryCount 20-byte records, immediately after the header:
//!     hash:u32 + (flags:u8 << 24 | pathOffset:u24):u32 + dataOffset:u32 +
//!     dataSize:u32 + unpackedSize:u32
//!     (a record with dataOffset == 0 is a vacant slot the archive was never
//!     repacked into, and carries no file)
//!   Paths region: pathsRegionSize bytes of null-terminated ASCII strings,
//!     immediately after the index. A record's path offset is an absolute
//!     offset into this region, not a sequential cursor.
//!   Data: each entry's bytes live at the absolute file offset `dataOffset`,
//!     `dataSize` bytes long; zlib-deflated (RFC 1950) when the top flag bit
//!     of the packed offset+flags field is set.
//!
//! Read-only: this app never writes back into the base game's ftl.dat.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

use flate2::read::ZlibDecoder;
use serde::Serialize;

const SIGNATURE: [u8; 4] = *b"PKG\n";
const HEADER_SIZE: usize = 16;
const RECORD_SIZE: usize = 20;
const DEFLATED_FLAG: u32 = 1 << 24;
const PATH_OFFSET_MASK: u32 = 0x00FF_FFFF;

fn be_u16(bytes: &[u8]) -> u16 {
    u16::from_be_bytes([bytes[0], bytes[1]])
}

fn be_u32(bytes: &[u8]) -> u32 {
    u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])
}

/// One resolved file living inside a PKG archive.
struct PkgEntry {
    inner_path: String,
    data_offset: u32,
    data_size: u32,
    deflated: bool,
}

#[derive(Serialize)]
pub struct PkgEntryInfo {
    pub path: String,
    pub size: u32,
}

/// A PKG archive's index, fully decoded into a flat entry list. This is the
/// only place that knows the on-disk layout -- listing and extraction just
/// work off the resulting entries.
struct PkgIndex {
    entries: Vec<PkgEntry>,
}

impl PkgIndex {
    /// Decodes a PKG archive's index. The header gives the number of records
    /// and the size of the paths region; the paths region is read whole
    /// because path offsets point anywhere inside it. Each record then
    /// becomes a `PkgEntry` (vacant records are skipped) in one pass.
    fn read(file: &mut File) -> Result<Self, String> {
        file.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;

        let mut header = [0u8; HEADER_SIZE];
        file.read_exact(&mut header).map_err(|e| e.to_string())?;

        if header[0..4] != SIGNATURE {
            return Err("Not a PKG archive (bad signature)".into());
        }
        let header_size = be_u16(&header[4..6]);
        if header_size as usize != HEADER_SIZE {
            return Err(format!(
                "Corrupt dat file: header claims header size is {header_size} bytes (expected {HEADER_SIZE})"
            ));
        }
        let record_size = be_u16(&header[6..8]);
        if record_size as usize != RECORD_SIZE {
            return Err(format!(
                "Corrupt dat file: header claims entries are {record_size} bytes (expected {RECORD_SIZE})"
            ));
        }
        let entry_count = be_u32(&header[8..12]) as usize;
        let paths_region_size = be_u32(&header[12..16]) as usize;

        let mut records = vec![0u8; entry_count * RECORD_SIZE];
        file.read_exact(&mut records).map_err(|e| e.to_string())?;

        let mut paths_region = vec![0u8; paths_region_size];
        file.read_exact(&mut paths_region).map_err(|e| e.to_string())?;

        let entries = records
            .chunks_exact(RECORD_SIZE)
            .map(|record| -> Result<Option<PkgEntry>, String> {
                // dataOffset lives first among the fields we care about --
                // check it before bothering to decode anything else, since a
                // vacant record has nothing meaningful in the rest anyway.
                let data_offset = be_u32(&record[8..12]);
                if data_offset == 0 {
                    return Ok(None);
                }

                let path_offset_and_flags = be_u32(&record[4..8]);
                let path_offset = (path_offset_and_flags & PATH_OFFSET_MASK) as usize;
                let deflated = (path_offset_and_flags & DEFLATED_FLAG) != 0;
                let data_size = be_u32(&record[12..16]);

                let path_bytes = paths_region
                    .get(path_offset..)
                    .ok_or_else(|| "Corrupt dat file: path offset out of range".to_string())?;
                let nul = path_bytes
                    .iter()
                    .position(|&b| b == 0)
                    .ok_or_else(|| "Corrupt dat file: unterminated path string".to_string())?;
                let inner_path = String::from_utf8_lossy(&path_bytes[..nul]).into_owned();

                Ok(Some(PkgEntry { inner_path, data_offset, data_size, deflated }))
            })
            .collect::<Result<Vec<Option<PkgEntry>>, String>>()?
            .into_iter()
            .flatten()
            .collect();

        Ok(PkgIndex { entries })
    }

    fn find(&self, inner_path: &str) -> Option<&PkgEntry> {
        self.entries.iter().find(|e| e.inner_path == inner_path)
    }
}

/// Reads one entry's bytes off disk and inflates them if the archive stored
/// them compressed.
fn extract(file: &mut File, entry: &PkgEntry) -> Result<Vec<u8>, String> {
    file.seek(SeekFrom::Start(entry.data_offset as u64))
        .map_err(|e| e.to_string())?;

    let mut raw = vec![0u8; entry.data_size as usize];
    file.read_exact(&mut raw).map_err(|e| e.to_string())?;

    if !entry.deflated {
        return Ok(raw);
    }

    let mut out = Vec::new();
    ZlibDecoder::new(&raw[..])
        .read_to_end(&mut out)
        .map_err(|e| e.to_string())?;
    Ok(out)
}

/// Lists every inner path in a PKG archive (ftl.dat), with its packed size.
#[tauri::command]
pub fn pkg_list_entries(dat_path: String) -> Result<Vec<PkgEntryInfo>, String> {
    let mut file = File::open(&dat_path).map_err(|e| e.to_string())?;
    let index = PkgIndex::read(&mut file)?;
    Ok(index
        .entries
        .into_iter()
        .map(|e| PkgEntryInfo { path: e.inner_path, size: e.data_size })
        .collect())
}

/// Reads and inflates (if needed) a single inner file's bytes from a PKG archive.
#[tauri::command]
pub fn pkg_read_entry(dat_path: String, inner_path: String) -> Result<Vec<u8>, String> {
    let mut file = File::open(&dat_path).map_err(|e| e.to_string())?;
    let index = PkgIndex::read(&mut file)?;
    let entry = index
        .find(&inner_path)
        .ok_or_else(|| format!("Inner path not found in archive: {inner_path}"))?;
    extract(&mut file, entry)
}
