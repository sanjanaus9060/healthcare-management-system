import { api } from "./api";

async function fetchBlobUrl(fileId) {
  const res = await api.get(`/records/files/${fileId}`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function openFile(fileId) {
  const win = window.open("", "_blank");
  try {
    const url = await fetchBlobUrl(fileId);
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

export async function downloadFile(fileId, fileName) {
  const url = await fetchBlobUrl(fileId);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
