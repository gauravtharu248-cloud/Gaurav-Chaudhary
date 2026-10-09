import JSZip from 'jszip';
import { PROJECT_FILES } from '../data/projectFiles';

export async function downloadProjectZip() {
  const zip = new JSZip();

  // Root files
  for (const file of PROJECT_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate binary zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'androidbridge-linux-cli.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
