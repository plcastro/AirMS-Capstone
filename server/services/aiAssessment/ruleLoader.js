const ManualRule = require("../../models/manualRuleModel");
const DEFAULT_MANUAL_RULES = require("./defaultRules");

const sanitizeRule = (rule = {}) => ({
  ruleCode: rule.ruleCode,
  title: rule.title,
  description: rule.description || "",
  category: rule.category || "",
  conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
  riskLevel: rule.riskLevel,
  possibleIssue: rule.possibleIssue || "",
  component: rule.component || "",
  recommendedActions: Array.isArray(rule.recommendedActions)
    ? rule.recommendedActions
    : [],
  explanationTemplate: rule.explanationTemplate || "",
  manualReference: rule.manualReference || "",
  isStarterRule: Boolean(rule.isStarterRule),
  active: rule.active !== false,
});

const getManualRules = async () => {
  const storedRules = await ManualRule.find({ active: true }).lean();

  if (!storedRules.length) {
    return DEFAULT_MANUAL_RULES.map(sanitizeRule);
  }

  return storedRules.map(sanitizeRule);
};

module.exports = {
  getManualRules,
  DEFAULT_MANUAL_RULES: DEFAULT_MANUAL_RULES.map(sanitizeRule),
};
