// Mock mínimo de ExcelJS para tests que no lo necesitan
module.exports = {
  Workbook: jest.fn().mockImplementation(() => ({
    xlsx: {
      load: jest.fn().mockResolvedValue(undefined),
      writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    },
    worksheets: [],
    getWorksheet: jest.fn(),
    addWorksheet: jest.fn(),
  })),
};
