const crypto = require("crypto");
const AiInsightCache = require("../../models/aiInsightCacheModel");
const { buildFactsMap } = require("./factBuilder");
const { runInference } = require("./inferenceEngine");
const { getManualRules } = require("./ruleLoader");
const { getManualProcedures } = require("./procedureLoader");
const {
  enrichInsightWithLLM,
  getLlmConfig,
  getLlmCooldown,
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
  scheduledTasks: (evidence.scheduledTasks || [])
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
  postInspectionNotes: (evidence.postInspectionNotes || [])
    .map((item) => item.id)
    .filter(Boolean),
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

const buildEvidenceSignature = (insight = {}) => {
  const signatureSource = {
    aircraftId: insight.aircraftId || "",
    issueTitle: insight.issueTitle || "",
    matchedRuleCodes: (insight.matchedRules || [])
      .map((rule) => rule.ruleCode)
      .filter(Boolean)
      .sort(),
    sourceRecords: (insight.sourceSnippets || [])
      .map((item) => ({
        source: item.source || "",
        recordId: item.recordId || "",
        signalKeys: item.signalKeys || [],
        text: item.text || "",
      }))
      .sort((left, right) =>
        `${left.source}:${left.recordId}:${left.text}`.localeCompare(
          `${right.source}:${right.recordId}:${right.text}`,
        ),
      ),
    recommendedAction: insight._ruleRecommendedAction || insight.recommendedAction || "",
    manualReferences: insight._ruleManualReferences || insight.manualReferences || [],
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(signatureSource))
    .digest("hex");
};

const buildInsightCacheKey = (insight = {}) =>
  `${insight.aircraftId || insight.aircraft || "unknown"}:${buildEvidenceSignature(insight)}`;

const applyCachedLlmInsights = async (rawInsights = []) => {
  const eligibleInsights = rawInsights.filter(
    (insight) => (insight.matchedRules || []).length > 0,
  );

  if (!eligibleInsights.length) {
    return rawInsights;
  }

  const cacheKeys = eligibleInsights.map(buildInsightCacheKey);
  const cachedRows = await AiInsightCache.find({
    cacheKey: { $in: cacheKeys },
  }).lean();
  const cacheByKey = new Map(cachedRows.map((row) => [row.cacheKey, row]));

  return rawInsights.map((insight) => {
    const cached = cacheByKey.get(buildInsightCacheKey(insight));
    if (!cached) {
      return insight;
    }

    return {
      ...insight,
      managerSummary: cached.managerSummary || insight.managerSummary,
      managerSummarySource: cached.managerSummary ? "openai" : insight.managerSummarySource,
      recommendedAction: cached.recommendedAction || insight.recommendedAction,
      recommendedActions: Array.isArray(cached.recommendedActions)
        ? cached.recommendedActions
        : insight.recommendedActions,
      manualReferences: Array.isArray(cached.manualReferences)
        ? cached.manualReferences
        : insight.manualReferences,
      procedureReference: cached.procedureReference || insight.procedureReference,
      procedureTitle: cached.procedureTitle || insight.procedureTitle,
      procedureSummary: cached.procedureSummary || insight.procedureSummary,
      defectDetails: cached.defectDetails || insight.defectDetails,
      defectDetailsSource: cached.defectDetailsSource || insight.defectDetailsSource,
    };
  });
};

const saveLlmInsightCaches = async (insights = [], llmSummaries = []) => {
  if (!llmSummaries.length) {
    return;
  }

  const rawInsightByAircraftId = new Map(
    insights.map((insight) => [insight.aircraftId, insight]),
  );
  const model = getLlmConfig().model;
  const operations = llmSummaries
    .filter((summary) => summary.managerSummarySource === "openai")
    .map((summary) => {
      const insight = rawInsightByAircraftId.get(summary.aircraftId);
      if (!insight) {
        return null;
      }

      return {
        updateOne: {
          filter: { cacheKey: buildInsightCacheKey(insight) },
          update: {
            $set: {
              cacheKey: buildInsightCacheKey(insight),
              aircraftId: insight.aircraftId,
              aircraft: insight.aircraft || "",
              issueTitle: insight.issueTitle || "",
              evidenceSignature: buildEvidenceSignature(insight),
              matchedRuleCodes: (insight.matchedRules || [])
                .map((rule) => rule.ruleCode)
                .filter(Boolean),
              managerSummary: summary.managerSummary || "",
              recommendedAction: summary.recommendedAction || "",
              recommendedActions: summary.recommendedActions || [],
              manualReferences: summary.manualReferences || [],
              procedureReference: insight.procedureReference || "",
              procedureTitle: insight.procedureTitle || "",
              procedureSummary: insight.procedureSummary || "",
              defectDetails: summary.defectDetails || null,
              defectDetailsSource: summary.defectDetailsSource || "none",
              model,
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (operations.length) {
    await AiInsightCache.bulkWrite(operations);
  }
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
          scheduledTasks: entry.evidence.scheduledTasks.length,
          overdueTasks: entry.evidence.overdueTasks.length,
          pendingApprovalTasks: entry.evidence.pendingApprovalTasks.length,
          hydraulicTasks: entry.evidence.hydraulicTasks.length,
          pendingFlights: entry.evidence.pendingFlights.length,
          recentRemarkFlights: entry.evidence.recentRemarkFlights.length,
          hydraulicFlights: entry.evidence.hydraulicFlights.length,
          postInspectionNotes: entry.evidence.postInspectionNotes.length,
        },
      scheduledTasks: entry.evidence.scheduledTasks,
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
    const cachedInsights = await applyCachedLlmInsights(rawInsights);
    return cachedInsights.map(toPublicInsight);
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
    if (getLlmCooldown().active) {
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
      managerSummarySource: llmUsed ? "openai" : "rule-fallback",
      recommendedAction: insight._ruleRecommendedAction,
      recommendedActions: insight._ruleRecommendedActions,
      manualReferences: insight._ruleManualReferences,
      defectDetails,
      defectDetailsSource: defectDetails ? "openai" : "none",
    });
  }

  await saveLlmInsightCaches(rawInsights, llmSummaries);

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
