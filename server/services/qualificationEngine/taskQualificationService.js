const User = require('../../models/userModel');
const Certificate = require('../../models/certificateRecordModel');
const Aircraft = require('../../models/aircraftModel');
const Monitoring = require('../../models/partsMonitoringModel');
const { evaluateQualification } = require('./qualificationService');
const { normalizeAircraft } = require('./normalizer');
const { qualificationSource, businessDate } = require('../certificates/certificateReviewService');
const { CertificateError } = require('../certificates/certificateErrors');

function createTaskQualificationService({ users = User, certificates = Certificate, aircraft = Aircraft, monitoring = Monitoring, now = () => new Date() } = {}) {
  async function aircraftType(registration) {
    if (typeof registration !== 'string' || !registration.trim() || registration.length > 80) throw new CertificateError(400, 'Select an aircraft registration.');
    const rpc = registration.trim().toUpperCase();
    const [fleet, monitored] = await Promise.all([
      aircraft.findOne({ tailNum: rpc }).select('type').lean(),
      monitoring.findOne({ aircraft: rpc }).select('aircraftType').lean(),
    ]);
    const labels = [fleet?.type, monitored?.aircraftType].filter(Boolean);
    const models = labels.map(normalizeAircraft);
    if (!models.length || models.some(model => !model) || new Set(models).size !== 1) throw new CertificateError(422, 'Aircraft model is missing, unsupported or inconsistent. Correct the aircraft records before assigning tasks.');
    return models[0];
  }
  async function evaluate(person, model, sources, asOf) {
    const result = evaluateQualification({ personnelData: person, certificates: sources.map(qualificationSource), aircraftType: model, asOf });
    return { id: String(person._id), name: `${person.firstName || ''} ${person.lastName || ''}`.trim(), aircraftType: model,
      qualified: result.qualified, reason: result.qualified ? 'Verified certificate — all tasks allowed' : result.failedRules[0] || 'A verified, valid certificate is required.',
      decision: result };
  }
  async function list(registration) {
    const model = await aircraftType(registration), asOf = businessDate(now());
    const people = await users.find({ jobTitle: 'Mechanic' }).select('_id firstName lastName jobTitle').lean();
    const sources = await certificates.find({ personnelId: { $in: people.map(person => person._id) }, status: 'VERIFIED' }).lean();
    return Promise.all(people.map(async person => {
      const result = await evaluate(person, model, sources.filter(source => String(source.personnelId) === String(person._id)), asOf);
      const { decision, ...option } = result;
      return option;
    }));
  }
  async function assertQualified(task) {
    if (typeof task.assignedTo !== 'string' || !/^[a-f0-9]{24}$/i.test(task.assignedTo)) throw new CertificateError(400, 'Select a mechanic.');
    const model = await aircraftType(task.aircraft);
    const person = await users.findById(task.assignedTo).select('_id firstName lastName jobTitle').lean();
    if (!person || String(person.jobTitle).toLowerCase() !== 'mechanic') throw new CertificateError(422, 'The selected person is not a mechanic.');
    const sources = await certificates.find({ personnelId: person._id, status: 'VERIFIED' }).lean();
    const result = await evaluate(person, model, sources, businessDate(now()));
    if (!result.qualified) {
      const error = new CertificateError(422, `${result.name || 'Selected mechanic'} is not qualified for ${model}. ${result.reason}`);
      error.code = 'AIRCRAFT_QUALIFICATION_REQUIRED';
      throw error;
    }
    return result;
  }
  return { list, assertQualified, aircraftType };
}
module.exports = { createTaskQualificationService };
