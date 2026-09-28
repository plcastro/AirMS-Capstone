// Labelled facts only; unidentified layouts remain available as raw text for review.
module.exports = Object.freeze({
  holderName: /^(?:holder(?:'s)? name|name of (?:holder|licensee|trainee)|full name|name(?=\s*[:\-]|$)|(?:is hereby )?awarded to|presented to|let it be known that|(?:this (?:is to |certificate )?)?certif(?:ies|y) that|(?:this )?certificate(?: of (?:training|completion|recognition))? (?:is (?:issued|awarded) to|awarded to))(?=\s|:|-|$)\s*[:\-]?\s*(.*?)(?:\s+has (?:successfully )?(?:completed|attended|passed).*)?$/i,
  certificateNumber: /^(?:certificate (?:no\.?|number|validation number|#)|cert\.? (?:no\.?|number|#)|license (?:no\.?|number|#))(?=\s|[:;\-]|$)\s*[:;\-]?\s*(.*)$/i,
  issuingAuthority: /^(?:issuing authority|issued by|issuer|training (?:provider|organization|organisation))\s*[:\-]?\s*(.*)$/i,
  certificateType: /^certificate type\s*[:\-]?\s*(.*)$/i,
  issueDate: /^(?:issue date|date (?:of issue|issued)|issued on|conferred on)(?=\s|[:\-]|$)\s*[:\-]?\s*(.*)$/i,
  expiryDate: /^(?:expiry date|expiration date|date of (?:expiry|expiration)|valid (?:until|through)|expires on)(?=\s|[:\-]|$)\s*[:\-]?\s*(.*)$/i,
  aircraftRatings: /^(?:aircraft(?: (?:type|ratings?))?|type ratings?)\s*[:\-]\s*(.*)$/i,
  qualifications: /^(?:(?:qualifications?|training completed|course(?: title)?)\s*[:\-]\s*|has (?:satisfactorily|successfully) completed a course of\s*)(.*)$/i,
  taskAuthorizations: /^(?:task authori[sz]ations?|authori[sz]ed tasks?)\s*[:\-]\s*(.*)$/i,
  limitations: /^(?:limitations?|restrictions?)\s*[:\-]\s*(.*)$/i,
});
