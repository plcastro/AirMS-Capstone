const { createReportExcelBuffer } = require("../services/reportExcelService");

const exportReportExcel = async (req, res) => {
  try {
    const title = String(req.body?.title || "Reports and Analytics");
    const buffer = await createReportExcelBuffer({ title, sections: req.body?.sections });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="ReportsAndAnalytics.xlsx"');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    const validation = /required|at most|must include|can contain/i.test(error.message);
    return res.status(validation ? 400 : 500).json({
      message: validation ? error.message : "Failed to generate Excel report.",
    });
  }
};

module.exports = { exportReportExcel };
