import { jsPDF } from 'jspdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'in',
  format: 'letter'
});

console.log("Page Size in Inches:");
console.log("Width:", doc.internal.pageSize.getWidth());
console.log("Height:", doc.internal.pageSize.getHeight());
console.log("Units:", doc.internal.pageSize.unit);
