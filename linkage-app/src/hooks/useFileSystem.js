import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';

export function useFileSystem(parseLinkageFile, setupProjectCallback) {
  const [rootHandle, setRootHandle] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [fileHandles, setFileHandles] = useState([]);
  const [activeFileHandle, setActiveFileHandle] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  // 1. Khởi tạo kết nối với Master Folder từ Storage
  useEffect(() => {
    const init = async () => {
      const savedRoot = await get('master_root_handle');
      if (savedRoot && (await savedRoot.queryPermission({ mode: 'readwrite' })) === 'granted') {
        setupProject(savedRoot);
      }
    };
    init();
  }, []);

  // 2. Thiết lập dự án và load Vaults.json
  const setupProject = async (handle) => {
    setRootHandle(handle);
    try {
      const dataFolder = await handle.getDirectoryHandle('data', { create: true });
      const vaultFileHandle = await dataFolder.getFileHandle('Vault.json', { create: true });
      const text = await (await vaultFileHandle.getFile()).text();
      let config = text ? JSON.parse(text) : { vaults: [] };
      
      const loadedVaults = [];
      for (const v of config.vaults) {
        try {
          let current = handle;
          for (const name of v.path) current = await current.getDirectoryHandle(name);
          loadedVaults.push(current);
        } catch (e) { console.warn("Vault path not found:", v.name); }
      }
      setVaults(loadedVaults);
      if (loadedVaults.length > 0) loadFiles(loadedVaults[0]);
    } catch (err) { console.error("Setup project error:", err); }
  };

  // 3. Quét file .md trong thư mục
  const loadFiles = async (dir) => {
    const files = [];
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) files.push(entry);
    }
    setFileHandles(files);
  };

  // 4. Thêm Vault mới
  const handleAddVault = async () => {
    if (!rootHandle) return;
    try {
      const newVaultHandle = await window.showDirectoryPicker();
      const relativePath = await rootHandle.resolve(newVaultHandle);
      if (!relativePath) return alert("Vault phải nằm trong Master Folder!");

      const dataDir = await rootHandle.getDirectoryHandle('data');
      const fileHandle = await dataDir.getFileHandle('Vault.json');
      const config = JSON.parse(await (await fileHandle.getFile()).text() || '{"vaults":[]}');

      const newEntry = { name: newVaultHandle.name, path: relativePath };
      if (config.vaults.some(v => v.name === newEntry.name)) return alert("Trùng tên!");

      config.vaults.push(newEntry);
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(config, null, 2));
      await writable.close();

      setVaults(prev => [...prev, newVaultHandle]);
      loadFiles(newVaultHandle);
    } catch (e) { console.error(e); }
  };

  // 5. Lưu file
    const saveFile = async (linkageData, parseLinkageFile, composeLinkageFile) => {
    if (!activeFileHandle || !linkageData) return false;
    try {
        // 1. Tự thân vận động: Đọc nội dung hiện tại từ ổ cứng
        const file = await activeFileHandle.getFile();
        const currentText = await file.text();

        // 2. Sử dụng công cụ parse được truyền vào để lấy khung xương
        const { part1, part3, success } = parseLinkageFile(currentText);
        if (!success) throw new Error("Không thể phân tích cấu trúc file để lưu.");

        // 3. Hợp nhất với dữ liệu graph mới từ App.jsx
        const finalContent = composeLinkageFile(part1, linkageData, part3);

        // 4. Ghi xuống đĩa
        const writable = await activeFileHandle.createWritable();
        await writable.write(finalContent);
        await writable.close();
        
        return true;
    } catch (err) {
        console.error("Save system error:", err);
        return false;
    }
    };

  const openMasterFolder = async () => {
    try {
      const h = await window.showDirectoryPicker();
      await set('master_root_handle', h);
      setupProject(h);
    } catch (e) { console.error("User cancelled or error:", e); }
  };

  return {
    rootHandle, vaults, fileHandles, activeFileHandle, selectedFileName,
    setActiveFileHandle, setSelectedFileName,
    openMasterFolder, handleAddVault, loadFiles, saveFile
  };
}