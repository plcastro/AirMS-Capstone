const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCertificateFields, parseCertificateDate } = require('../services/certificates/certificateFieldParser');

// Invented people and references, modelled on document layouts, not private scans.
const parse = rawText => parseCertificateFields({ rawText, pages: [{ page: 1, method: 'PDF_TEXT', text: rawText, confidence: null }] });

test('bilingual recipient and footer columns preserve the holder, issuer, number and issue date', () => {
  const result = parse(`CERTIFICATE OF RECOGNITION / CERTIFICAT DE RECONNAISSANCE
This certificate of recognition is issued to: / Ce certificat de reconnaissance est décerné à :
SANTOS Alex
Date and place of birth / Date et lieu de naissance : 14-Dec-1980 - Manila
By / par : Example Engines, Avenue du Test, France
of the approved engine type training course stated below / de la formation de type moteur
T1 ARRIEL 2 for the/pour Eurocopter AS 350 & EC 130 variant ARRIEL 2B/2B1/2D
and the related examinations in compliance with Regulation
at / à Example Centre from / du 30-May-2022 to / au 03-Jun-2022
Certificate Reference Date Instructor/Examiner
FR.147.9999 June 3, 2022
EXAMPLE_0001_A003_1234 EXAMPLE INSTRUCTOR`);
  assert.equal(result.holderName, 'SANTOS Alex');
  assert.equal(result.issuingAuthority, 'Example Engines');
  assert.equal(result.certificateNumber, 'EXAMPLE_0001_A003_1234');
  assert.equal(result.issueDate, '2022-06-03');
  assert.equal(result.expiryDate, null);
  assert.equal(result.doesNotExpire, false);
  assert.equal(result.qualifications.length, 1);
  assert.match(result.qualifications[0], /^T1 ARRIEL/);
  assert.deepEqual(result.aircraftRatings, []);
  assert.equal(result.requiresManualReview, true);
  assert.ok(result.evidence.some(item => item.field === 'issueDate' && item.text.includes('Certificate Reference')));
});

test('French issue dates and reordered footer rows do not use birth or course interval dates', () => {
  for (const [input, date] of [['le 17 février 2012', '2012-02-17'], ['le 1 juin 2012', '2012-06-01'], ['16 juillet 2001', '2001-07-16'], ['29 TH-DAY-OF JANUARY 1988', '1988-01-29']]) {
    assert.equal(parseCertificateDate(input).value, date);
  }
  const result = parse(`Certificate N°/N° de Certificat Date/Date Instructor-Examiner
This certificate is awarded to /Ce certificat est décerné à :
Alex Santos
Date and place of birth/Date et lieu de naissance: May 15th, 1980
By/par EXAMPLE ENGINES
the engine type training only, named below/de type moteur seulement
Arriel 2B/2B1/2D 1st line maintenance course
from/du May 28th, 2012 to/au June 01st, 2012
Instructeur-Examinateur
99999-12345 le 1 juin 2012 Example Instructor`);
  assert.equal(result.certificateNumber, '99999-12345');
  assert.equal(result.issueDate, '2012-06-01');
  assert.equal(result.holderName, 'Alex Santos');
  assert.equal(result.expiryDate, null);
});

test('course approval expiry and birth dates never become certificate validity', () => {
  const result = parse(`CERTIFICATE OF TRAINING
THIS IS TO CERTIFY THAT
Alex Santos
Has satisfactorily completed 80 course hours on
May 12, 2017 entitled:
KING AIR 300 / 350 INITIAL
MAINTENANCE TRAINING
FAA Course Acceptance No. EXAMPLE-123
Expiration Date of Course Approval Number: October 31, 2017
Date and place of birth: 12 May 1980`);
  assert.equal(result.holderName, 'Alex Santos');
  assert.deepEqual(result.qualifications, ['KING AIR 300 / 350 INITIAL', 'MAINTENANCE TRAINING']);
  assert.equal(result.issueDate, null);
  assert.equal(result.expiryDate, null);
  assert.equal(result.doesNotExpire, false);
  assert.equal(result.certificateNumber, null);
  assert.ok(result.warnings.some(item => item.code === 'COURSE_APPROVAL_EXPIRY_NOT_CERTIFICATE_EXPIRY'));
  for (const label of ['Date of expiry', 'Date of expiration']) {
    const expiry = parse(`${label}: 20 May 2027`);
    assert.equal(expiry.expiryDate, '2027-05-20');
    assert.equal(expiry.issueDate, null);
  }
});

test('airframe training restrictions and differences remain visible without implied coverage', () => {
  const result = parse(`Certificate of Training Awarded to
Alex Santos
in recognition of successful completion of
T1 Airframe Type Qualification (Engine not included)
on AS350B3/B3e to B2 Differences (Turbomeca Arriel 1)
At Example Centre
From 20 May 2013 to 21 May 2013
Example Instructor`);
  assert.equal(result.holderName, 'Alex Santos');
  assert.deepEqual(result.aircraftRatings, []);
  assert.equal(result.issueDate, null);
  assert.equal(result.expiryDate, null);
  assert.equal(result.qualifications.length, 2);
  assert.ok(result.limitations.some(text => /Engine not included/.test(text)));
  assert.ok(result.limitations.some(text => /Differences/.test(text)));
  assert.ok(result.warnings.some(item => item.code === 'RESTRICTION_REQUIRES_REVIEW'));
});

test('practical exercise layout finds the recipient between title and completion, excluding signatures', () => {
  const result = parse(`Certification of Practical Exercises
AS350 B3 INITIAL AIRFRAME FIELD MAINTENANCE
COURSE INTERMEDIATE LEVEL (60 Hours)
Alex Santos Jr.
Has successfully completed the above mentioned course
In the time from September 29 - October 10, 2014 with
Main Rotor Drive System (4.0 Hours)
Signed: Example Instructor
Manager, Technical Training`);
  assert.equal(result.holderName, 'Alex Santos Jr.');
  assert.equal(result.qualifications.length, 2);
  assert.ok(result.qualifications.every(value => !value.includes('Alex') && !value.includes('Signed')));
  assert.deepEqual(result.aircraftRatings, []);
  assert.equal(result.issueDate, null);
});

test('licensing table separates explicit airframe ratings from powerplant names', () => {
  const result = parse(`NAME
LICENSE
Date: December 16, 2010
Alex Santos
No. 99999 Aircraft Mechanic
LICENSE TYPE AND AIRCRAFT RATING
Name of Specific Aircraft
TYPE II
Airframe
: BK 117 C1, Bell 412 EP,
: Bell 206B3
Powerplant
: Arriel 1 E2, PT6T-3DF
TYPE II - LINE & BASE MAINTENANCE`);
  assert.equal(result.holderName, 'Alex Santos');
  assert.deepEqual(result.aircraftRatings, ['B412EP']);
  assert.ok(result.unknownAircraftRatings.includes('BK 117 C1'));
  assert.ok(result.unknownAircraftRatings.includes('Bell 206B3'));
  assert.ok(result.originalExtractedFields.aircraftRatings.every(value => !value.includes('Arriel')));
});

test('recipient labels do not turn course headings, dates or signatures into names', () => {
  for (const line of ['Date of birth: 15 May 1980', 'AS350B3 Airframe Maintenance Course', 'Instructor Example Person', 'License', 'Name of Specific Aircraft']) {
    assert.equal(parse(`This certificate certifies that\n${line}`).holderName, null, line);
  }
  assert.equal(parse('Unknown Person').holderName, null);
  assert.equal(parse('Certificate of Training\nInstructor Alex Santos\nhas successfully completed the\nExample course').holderName, null);
});

test('alternate recipient phrasings and military labels preserve the printed name', () => {
  for (const prefix of ['This certificate certifies that', 'This Certificate of Completion is issued to:', 'LET IT BE KNOWN THAT', 'IS HEREBY AWARDED TO', 'THIS 1S TO CERTIFY THAT']) {
    assert.equal(parse(`${prefix}\nAlex Santos`).holderName, 'Alex Santos', prefix);
  }
  assert.equal(parse('IS HEREBY AWARDED TO\nA2C Alex Santos 123456 PAF').holderName, 'A2C Alex Santos 123456 PAF');
});

test('formatting-only name and date differences preserve evidence but different letters stay unresolved', () => {
  const consistent = parse('Holder Name: Alex A. Santos\nHolder Name: ALEX A SANTOS\nIssue Date: le 1 juin 2012\nIssue Date: 2012-06-01');
  assert.equal(consistent.holderName, 'Alex A. Santos');
  assert.equal(consistent.originalExtractedFields.holderName.length, 2);
  assert.equal(consistent.issueDate, '2012-06-01');
  assert.equal(parse('Holder Name: Alex Santos\nHolder Name: Alexis Santos').holderName, null);
  assert.equal(parse('Issue Date: 2012-06-01\nDate: June 2, 2012').issueDate, null);
});

test('exam checkbox text requires visual review and never asserts a pass', () => {
  const result = parse('This certificate is awarded to /Ce certificat est décerné à :\nAlex Santos\nhas completed the theory & practical course [X]\nHas passed the exam for/a réussi [ ]');
  assert.ok(result.warnings.some(item => item.code === 'ASSESSMENT_MARKINGS_REQUIRE_VISUAL_REVIEW'));
  assert.deepEqual(result.qualifications, []);
  assert.equal(result.passed, undefined);
  assert.equal(result.requiresManualReview, true);
});
