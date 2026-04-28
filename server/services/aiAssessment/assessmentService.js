const { buildFactsMap } = require("./factBuilder");
const { runInference } = require("./inferenceEngine");
const { getManualRules } = require("./ruleLoader");
const { summarizeInsightWithLLM } = require("./llmExplainer");

const RISK_SORT = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

const collectRelatedRecordIds = (evidence = {}) => ({
  overdueParts: (evidence.overdueParts || []).map((item) => item.componentName),
  dueSoonParts: (evidence.dueSoonParts || []).map((item) => item.componentName),
  maintenanceLogs: (evidence.maintenanceLogs || []).map((item) => item.id).filter(Boolean),
  hydraulicMaintenanceLogs: (evidence.hydraulicMaintenanceLogs || [])
    .map((item) => item.id)
    .filter(Boolean),
  overdueTasks: (evidence.overdueTasks || []).map((item) => item.id).filter(Boolean),
  pendingApprovalTasks: (evidence.pendingApprovalTasks || [])
    .map((item) => item.id)
    .filter(Boolean),
  hydraulicTasks: (evidence.hydraulicTasks || []).map((item) => item.id).filter(Boolean),
  pendingFlights: (evidence.pendingFlights || []).map((item) => item.id).filter(Boolean),
  recentRemarkFlights: (evidence.recentRemarkFlights || [])
    .map((item) => item.id)
    .filter(Boolean),
  hydraulicFlights: (evidence.hydraulicFlights || []).map((item) => item.id).filter(Boolean),
});

const buildMaintenanceInsights = async ({
  includeLLMSummary = false,
  llmLimit = 0,
} = {}) => {
  const [rules, { aircraftFacts }] = await Promise.all([
    getManualRules(),
    buildFactsMap(),
  ]);

  const rawInsights = aircraftFacts.map((entry) => {
    const inference = runInference(rules, entry);

    return {
      aircraftId: entry.aircraftId,
      aircraft: entry.aircraftLabel,
      aircraftModel: entry.aircraftModel || "",
      component:
        inference.primaryRule?.component ||
        inference.matchedRules[0]?.component ||
        "General Maintenance",
      riskLevel: inference.riskLevel,
      issueTitle: inference.issueTitle,
      shortFinding: inference.shortFinding,
      recommendedAction: inference.recommendedAction,
      recommendedActions: inference.recommendedActions,
      manualReferences: inference.manualReferences,
      matchedRules: inference.matchedRules,
      explanation: inference.explanation,
      managerSummary: inference.managerSummary,
      managerSummarySource: "rule-fallback",
      sourceCounts: entry.sourceCounts,
        evidenceCounts: {
          overdueParts: entry.evidence.overdueParts.length,
          dueSoonParts: entry.evidence.dueSoonParts.length,
          maintenanceLogs: entry.evidence.maintenanceLogs.length,
          hydraulicMaintenanceLogs: entry.evidence.hydraulicMaintenanceLogs.length,
          overdueTasks: entry.evidence.overdueTasks.length,
          pendingApprovalTasks: entry.evidence.pendingApprovalTasks.length,
          hydraulicTasks: entry.evidence.hydraulicTasks.length,
          pendingFlights: entry.evidence.pendingFlights.length,
          recentRemarkFlights: entry.evidence.recentRemarkFlights.length,
          hydraulicFlights: entry.evidence.hydraulicFlights.length,
        },
      relatedRecordIds: collectRelatedRecordIds(entry.evidence),
      generatedAt: new Date().toISOString(),
    };
  });

  rawInsights.sort((left, right) => {
    if (RISK_SORT[left.riskLevel] !== RISK_SORT[right.riskLevel]) {
      return RISK_SORT[left.riskLevel] - RISK_SORT[right.riskLevel];
    }

    return left.aircraft.localeCompare(right.aircraft);
  });

  if (!includeLLMSummary) {
    return rawInsights;
  }

  const normalizedLlmLimit = Number.isFinite(Number(llmLimit))
    ? Math.max(0, Number(llmLimit))
    : 0;
  const llmEligibleInsights =
    normalizedLlmLimit > 0 ? rawInsights.slice(0, normalizedLlmLimit) : rawInsights;

  const llmSummaries = await Promise.all(
    llmEligibleInsights.map(async (insight) => {
      const llmSummary = await summarizeInsightWithLLM(insight);
      return {
        aircraftId: insight.aircraftId,
        managerSummary: llmSummary || insight.managerSummary,
        managerSummarySource: llmSummary ? "gemini" : "rule-fallback",
      };
    }),
  );

  const llmSummaryByAircraftId = new Map(
    llmSummaries.map((item) => [item.aircraftId, item]),
  );

  return rawInsights.map((insight) => {
    const llmResult = llmSummaryByAircraftId.get(insight.aircraftId);
    if (!llmResult) {
      return insight;
    }

    return {
      ...insight,
      managerSummary: llmResult.managerSummary,
      managerSummarySource: llmResult.managerSummarySource,
    };
  });
};

module.exports = {
  buildMaintenanceInsights,
};
