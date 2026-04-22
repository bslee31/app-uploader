import AdmZip from 'adm-zip';

export interface AabInfo {
  versionCode: number | null;
  versionName: string | null;
}

// AAB 的 base/manifest/AndroidManifest.xml 是 aapt protobuf 格式 (XmlNode)。
// XmlAttribute { namespace_uri=1, name=2, value=3, source=4, resource_id=5, compiled_item=6 }
// 搜尋指定 attribute name 後讀取 value 字串。
export function inspectAab(aabPath: string): AabInfo {
  let manifest: Buffer;
  try {
    const zip = new AdmZip(aabPath);
    const entry = zip.getEntry('base/manifest/AndroidManifest.xml');
    if (!entry) return { versionCode: null, versionName: null };
    manifest = entry.getData();
  } catch {
    return { versionCode: null, versionName: null };
  }

  const versionName = findAttributeValue(manifest, 'versionName');
  const versionCodeStr = findAttributeValue(manifest, 'versionCode');
  const versionCode = versionCodeStr ? parseVersionCode(manifest, versionCodeStr) : null;

  return { versionCode, versionName };
}

export function extractVersionNameFromAab(aabPath: string): string | null {
  return inspectAab(aabPath).versionName;
}

function parseVersionCode(manifest: Buffer, raw: string): number | null {
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  // value 可能是空字串（編譯後只留 compiled_item）。嘗試從 compiled_item 讀 int_decimal_value。
  return findVersionCodeFromCompiledItem(manifest);
}

// 搜尋 name = 指定字串的 XmlAttribute，回傳其 value 字串。
function findAttributeValue(manifest: Buffer, attrName: string): string | null {
  const nameBytes = Buffer.from(attrName, 'utf-8');
  if (nameBytes.length > 127) return null;
  // tag=0x12 (field 2 LEN) + length varint + attrName
  const needle = Buffer.concat([Buffer.from([0x12, nameBytes.length]), nameBytes]);

  let searchFrom = 0;
  while (searchFrom < manifest.length) {
    const idx = manifest.indexOf(needle, searchFrom);
    if (idx < 0) return null;
    searchFrom = idx + needle.length;

    const value = readValueAfterName(manifest, searchFrom);
    if (value !== null) return value;
  }
  return null;
}

function readValueAfterName(buf: Buffer, start: number): string | null {
  let pos = start;
  const hardLimit = Math.min(buf.length, start + 512);

  while (pos < hardLimit) {
    const tag = buf[pos];
    if (tag === 0x1a) {
      const [len, next] = readVarint(buf, pos + 1);
      if (len < 0 || next + len > buf.length) return null;
      return buf.slice(next, next + len).toString('utf-8');
    }
    const skipped = skipField(buf, pos);
    if (skipped < 0) return null;
    pos = skipped;
  }
  return null;
}

// android:versionCode 的 resource id 是 0x0101021b (16843291)。
// 搜尋 XmlAttribute.resource_id 欄位等於此值，接著讀 compiled_item.prim.int_decimal_value。
// Item { prim=1, ref=..., str=..., ... }，Primitive 包含 int_decimal_value (field 6)。
// 做比較保守的搜尋：找「tag 0x28 (field 5 VARINT) + varint=16843291」後再找 compiled_item。
function findVersionCodeFromCompiledItem(manifest: Buffer): number | null {
  const resourceIdTag = 0x28;
  const targetResourceId = 16843291;

  let pos = 0;
  while (pos < manifest.length - 5) {
    if (manifest[pos] === resourceIdTag) {
      const [val, next] = readVarint(manifest, pos + 1);
      if (val === targetResourceId) {
        // compiled_item 通常緊接在 resource_id 之後，tag = 0x32 (field 6 LEN)
        if (next < manifest.length && manifest[next] === 0x32) {
          const [len, itemStart] = readVarint(manifest, next + 1);
          if (len > 0 && itemStart + len <= manifest.length) {
            const intVal = readIntDecimalFromItem(manifest.slice(itemStart, itemStart + len));
            if (intVal !== null) return intVal;
          }
        }
      }
      pos = next;
    } else {
      pos++;
    }
  }
  return null;
}

// Item.prim 是 field 1 (LEN)，內含 Primitive。Primitive 的 int_decimal_value 是 field 6 (VARINT, tag 0x30)。
function readIntDecimalFromItem(item: Buffer): number | null {
  let pos = 0;
  while (pos < item.length) {
    const tag = item[pos];
    if (tag === 0x0a) {
      // prim field
      const [len, next] = readVarint(item, pos + 1);
      if (len < 0 || next + len > item.length) return null;
      const prim = item.slice(next, next + len);
      // 在 Primitive 裡找 int_decimal_value (field 6, VARINT, tag 0x30)
      let p = 0;
      while (p < prim.length) {
        const t = prim[p];
        if (t === 0x30) {
          const [v] = readVarint(prim, p + 1);
          return v >= 0 ? v : null;
        }
        const skipped = skipField(prim, p);
        if (skipped < 0) return null;
        p = skipped;
      }
      return null;
    }
    const skipped = skipField(item, pos);
    if (skipped < 0) return null;
    pos = skipped;
  }
  return null;
}

function readVarint(buf: Buffer, pos: number): [number, number] {
  let result = 0;
  let shift = 0;
  let p = pos;
  while (p < buf.length) {
    const b = buf[p++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return [result, p];
    shift += 7;
    if (shift > 35) return [-1, p];
  }
  return [-1, p];
}

function skipField(buf: Buffer, pos: number): number {
  if (pos >= buf.length) return -1;
  const tag = buf[pos];
  const wireType = tag & 0x07;
  let p = pos + 1;
  switch (wireType) {
    case 0: {
      const [, next] = readVarint(buf, p);
      return next;
    }
    case 1:
      return p + 8;
    case 2: {
      const [len, next] = readVarint(buf, p);
      if (len < 0) return -1;
      return next + len;
    }
    case 5:
      return p + 4;
    default:
      return -1;
  }
}
