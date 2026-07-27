declare module 'pdf-parse/lib/pdf-parse.js' {
  type PdfParseResult = { text: string }
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>
  export default pdfParse
}
