# Initial Risks and Assumptions

## Risk register

| ID | Risk | Likelihood / impact | Initial treatment |
|---|---|---|---|
| R-001 | Uncontrolled migration of inaccurate, duplicate, or excessive personal data | High / High | Inventory, minimization, staging, provenance, validation, human reconciliation, dry runs |
| R-002 | Roles expose health or complaint data too broadly | Medium / Critical | Capability/default-deny policy, scoped queries, explicit sensitive grants, access audit tests |
| R-003 | Server/storage loss interrupts operations or loses records | Medium / Critical | UPS, monitored encrypted backups, approved off-site copy, documented restore drills |
| R-004 | Paper map or digitized geometry is treated as official despite uncertain provenance/accuracy | High / High | Preserve provenance, verification states, GIS sign-off, prominent uncertainty labels |
| R-005 | Unlicensed online tiles/assets break offline or create legal/privacy exposure | High / High | Local approved assets, license inventory, network isolation testing |
| R-006 | Complaint workflow encodes unsupported legal rules | Medium / Critical | Legal review and configurable neutral status model; defer unapproved mandates |
| R-007 | Sensitive attachments contain malware or leak through direct URLs/backups | Medium / Critical | Private storage, validation/scanning, authorization gateway, encryption, audit |
| R-008 | A single LAN server becomes a single point of failure | High / High | Define RPO/RTO, spares/recovery plan, tested restore, operational runbook |
| R-009 | Lost/stolen shared credentials undermine accountability | Medium / High | Named accounts, no sharing, policy/training, session controls, privileged protection |
| R-010 | Poor power/network/client hardware makes the UI unusable | Medium / High | Site survey, representative performance testing, UPS and LAN design |
| R-011 | Analytics produce conflicting counts due to unclear definitions/effective dates | High / High | Approve metric catalog and reusable canonical query definitions |
| R-012 | Retention automation deletes records unlawfully or backups retain them indefinitely | Medium / Critical | Legal/records approval, legal holds, dry-run/audited disposal, backup lifecycle design |
| R-013 | Technology is scaffolded against incompatible or unsupported versions | Medium / High | Verify official compatibility matrices and pin versions during Foundation |
| R-014 | Public/remote access is added by simple port forwarding | Medium / Critical | Architecture gate, separate threat model, controlled VPN/identity design if approved |

## Assumptions to validate

- A designated barangay owner can approve operational definitions and workflow.
- Privacy/legal and records owners will review sensitive processing and retention.
- A maintained on-premises server and backup custody can be funded and supported.
- Staff can use individual accounts and receive workflow/security training.
- Source-map scanning and digitization rights can be established.
- Synthetic representative data can support development before controlled migration.

An invalidated assumption becomes a decision or risk and may require architecture change.

