import 'package:flutter/material.dart';

const airmsTerms = <(String, String)>[
  ('Authorized Use', 'AirMS is intended for authorized aviation maintenance, logistics, and administrative personnel only. Users must access only the modules, aircraft records, reports, and actions required for their assigned role.'),
  ('Account Responsibility', 'You are responsible for keeping your username, password, PIN, verification codes, and trusted devices secure. Do not share credentials or allow another person to act under your account.'),
  ('Operational Records', 'Entries, approvals, signatures, inspection notes, requisitions, logs, and uploaded files must be accurate, timely, and based on verified information. AirMS records may be used for operational review, audit, compliance, and safety tracking.'),
  ('Data Privacy', 'AirMS may process account details, activity logs, device/session information, uploaded profile images, and maintenance-related records to operate the system, protect accounts, support audits, and improve reliability.'),
  ('Acceptable Conduct', 'Do not misuse AirMS, bypass security controls, upload harmful content, alter records without authority, or use system information outside approved company operations.'),
  ('Maintenance Authority', 'AirMS supports maintenance workflows but does not replace required professional judgment, approved manuals, regulatory requirements, or company procedures. Users remain responsible for following applicable standards.'),
  ('Updates', 'These terms may be updated as AirMS features, company policies, or compliance requirements change. Continued use of AirMS means you agree to the current terms.'),
];

const airmsPrivacy = <(String, String)>[
  ('Information We Collect', 'AirMS may collect account profile details, login and session activity, assigned role and base, profile images, device or browser information, notification preferences, uploaded files, and maintenance workflow records created through the system.'),
  ('How Information Is Used', 'Information is used to authenticate users, provide authorized access, maintain operational records, support inspections and approvals, send relevant notifications, protect accounts, troubleshoot issues, and support audit or compliance reviews.'),
  ('Maintenance and Audit Records', 'AirMS stores activity logs, timestamps, signatures, approvals, inspection entries, requisitions, messages, and related records to preserve accountability and traceability across maintenance operations.'),
  ('Sharing and Access', 'Information is available only to authorized personnel based on role, operational need, administrative responsibility, or compliance requirement. AirMS information should not be disclosed outside approved company processes.'),
  ('Security', 'AirMS uses access controls, authentication, session management, and activity tracking to help protect user accounts and operational data. Users must also protect their credentials and devices.'),
  ('Retention', 'Records may be retained as needed for aviation maintenance history, audit trails, legal obligations, company policy, safety review, and system administration.'),
  ('User Responsibilities', 'Users should keep profile information current where permitted, report suspicious account activity, avoid uploading unnecessary personal information, and contact an administrator for access or data concerns.'),
  ('Policy Updates', 'This Privacy Policy may be updated as AirMS features, operational processes, or compliance requirements change. Continued use of AirMS means you acknowledge the current policy.'),
];

Future<void> showAirmsLegal(BuildContext context, {required bool privacy}) => showDialog<void>(
  context: context,
  builder: (dialogContext) => Dialog(child: ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 560, maxHeight: 660),
    child: Column(children: [
      ListTile(title: Text(privacy ? 'Privacy Policy' : 'Terms and Conditions', style: Theme.of(dialogContext).textTheme.titleLarge),
        trailing: IconButton(tooltip: 'Close', icon: const Icon(Icons.close), onPressed: () => Navigator.pop(dialogContext))),
      const Divider(height: 1),
      Expanded(child: ListView(padding: const EdgeInsets.all(18), children: [
        for (final section in privacy ? airmsPrivacy : airmsTerms) ...[
          Text(section.$1, style: Theme.of(dialogContext).textTheme.titleMedium),
          const SizedBox(height: 5), Text(section.$2), const SizedBox(height: 18),
        ],
      ])),
      TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Close')),
    ]),
  )),
);
