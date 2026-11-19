import { useState } from "react";
import { FileUp } from "lucide-react";

export function FilePicker(props) {
  const [filename,setFilename] = useState("");
  return <span className="file-picker">
    <FileUp size={18} aria-hidden="true" />
    <span>{filename || "选择文件"}</span>
    <input {...props} type="file" onChange={event=>setFilename(event.target.files[0]?.name || "")} />
  </span>;
}
