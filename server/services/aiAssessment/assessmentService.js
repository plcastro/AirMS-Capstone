const { buildFactsMap } = require("./factBuilder");
const { runInference } = require("./inferenceEngine");
const { getManualRules } = require("./ruleLoader");
const { getManualProcedures } = require("./procedureLoader");
const {
  enrichInsightWithLLM,
  getGeminiCooldown,
} = require("./llmExplainer");

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

const collectSourceSnippets = (evidence = {}) =>
  (evidence.signalRecords || [])
    .filter((item) => item?.text)
    .slice(0, 8)
    .map((item) => ({
      source: item.source || "record",
      text: item.text,
      signalKeys: item.signalKeys || [],
      recordId: item.recordId || "",
    }));

const toPublicInsight = (insight = {}) => {
  const {
    _ruleRecommendedAction,
    _ruleRecommendedActions,
    _ruleManualReferences,
    ...publicInsight
  } = insight;

  return publicInsight;
};

const buildMaintenanceInsights = async ({
  includeLLMSummary = false,
  llmLimit = 0,
} = {}) => {
  const [rules, procedures, { aircraftFacts }] = await Promise.all([
    getManualRules(),
    getManualProcedures(),
    buildFactsMap(),
  ]);

  const rawInsights = aircraftFacts.map((entry) => {
    const inference = runInference(rules, entry, procedures);

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
      procedureReference: inference.procedureReference,
      procedureTitle: inference.procedureTitle,
      procedureSummary: inference.procedureSummary,
      procedureSteps: inference.procedureSteps,
      _ruleRecommendedAction: inference.recommendedAction,
      _ruleRecommendedActions: inference.recommendedActions,
      _ruleManualReferences: inference.manualReferences,
      matchedRules: inference.matchedRules,
      explanation: inference.explanation,
      managerSummary: inference.shortFinding,
      managerSummarySource: "rule-fallback",
      defectDetails: null,
      defectDetailsSource: "none",
      sourceSnippets: collectSourceSnippets(entry.evidence),
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
    return rawInsights.map(toPublicInsight);
  }

  const normalizedLlmLimit = Number.isFinite(Number(llmLimit))
    ? Math.max(0, Number(llmLimit))
    : 0;
  const llmEligibleInsights = rawInsights.filter(
    (insight) => (insight.matchedRules || []).length > 0,
  );
  const limitedLlmEligibleInsights =
    normalizedLlmLimit > 0
      ? llmEligibleInsights.slice(0, normalizedLlmLimit)
      : llmEligibleInsights;

  const llmSummaries = [];

  for (const insight of limitedLlmEligibleInsights) {
    if (getGeminiCooldown().active) {
      break;
    }

    const llmInputInsight = {
      ...insight,
      recommendedAction: insight._ruleRecommendedAction,
      recommendedActions: insight._ruleRecommendedActions,
      manualReferences: insight._ruleManualReferences,
    };
    const llmResult = await enrichInsightWithLLM(llmInputInsight);
    const llmSummary = llmResult?.managerSummary || "";
    const llmUsed = Boolean(llmResult);
    const defectDetails = llmResult?.defectDetails || null;

    llmSummaries.push({
      aircraftId: insight.aircraftId,
      managerSummary: llmSummary || insight.managerSummary,
      managerSummarySource: llmUsed ? "gemini" : "rule-fallback",
      recommendedAction: insight._ruleRecommendedAction,
      recommendedActions: insight._ruleRecommendedActions,
      manualReferences: insight._ruleManualReferences,
      defectDetails,
      defectDetailsSource: defectDetails ? "gemini" : "none",
    });
  }

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
      recommendedAction: llmResult.recommendedAction,
      recommendedActions: llmResult.recommendedActions,
      manualReferences: llmResult.manualReferences,
      defectDetails: llmResult.defectDetails || insight.defectDetails,
      defectDetailsSource: llmResult.defectDetailsSource,
    };
  }).map(toPublicInsight);
};

module.exports = {
  buildMaintenanceInsights,
};
