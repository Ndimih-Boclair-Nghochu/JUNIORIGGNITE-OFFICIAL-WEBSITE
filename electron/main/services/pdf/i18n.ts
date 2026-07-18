import type { Subsystem } from '@shared/types'

// Report-card / receipt / ID-card terminology keyed by class subsystem.
// Anglophone classes render English GCE-style terminology; Francophone classes
// render French terminology (bulletin, trimestre, moyenne, etc.), independent
// of the app's active UI language.
export interface PdfTerms {
  reportCardTitle: string
  studentName: string
  admissionNo: string
  className: string
  academicYear: string
  term: string
  subject: string
  ca: string
  exam: string
  average: string
  coefficient: string
  position: string
  total: string
  overallAverage: string
  rank: string
  grade: string
  remark: string
  conduct: string
  attendance: string
  teacherComment: string
  headTeacherComment: string
  promotionDecision: string
  promoted: string
  repeat: string
  pending: string
  signature: string
  classTeacher: string
  headTeacher: string
  outOf: string
  // ID card
  idCardTitle: string
  emergencyContact: string
  // Receipt
  receiptTitle: string
  receiptNo: string
  date: string
  amountPaid: string
  paymentMethod: string
  reference: string
  balance: string
  received: string
  principalSignature: string
  feeType: string
}

const EN: PdfTerms = {
  reportCardTitle: 'STUDENT REPORT CARD',
  studentName: 'Student Name',
  admissionNo: 'Admission No.',
  className: 'Class',
  academicYear: 'Academic Year',
  term: 'Term',
  subject: 'Subject',
  ca: 'C.A.',
  exam: 'Exam',
  average: 'Average',
  coefficient: 'Coef.',
  position: 'Position',
  total: 'Total',
  overallAverage: 'Overall Average',
  rank: 'Rank in Class',
  grade: 'Grade',
  remark: 'Remark',
  conduct: 'Conduct',
  attendance: 'Attendance',
  teacherComment: "Class Teacher's Comment",
  headTeacherComment: "Head Teacher's Comment",
  promotionDecision: 'Decision',
  promoted: 'PROMOTED',
  repeat: 'TO REPEAT',
  pending: 'PENDING',
  signature: 'Signature',
  classTeacher: 'Class Teacher',
  headTeacher: 'Head Teacher',
  outOf: 'out of',
  idCardTitle: 'STUDENT IDENTITY CARD',
  emergencyContact: 'Emergency Contact',
  receiptTitle: 'PAYMENT RECEIPT',
  receiptNo: 'Receipt No.',
  date: 'Date',
  amountPaid: 'Amount Paid',
  paymentMethod: 'Payment Method',
  reference: 'Reference',
  balance: 'Balance',
  received: 'Received with thanks',
  principalSignature: "Principal's Signature & Stamp",
  feeType: 'Fee Type'
}

const FR: PdfTerms = {
  reportCardTitle: "BULLETIN DE NOTES",
  studentName: "Nom de l'élève",
  admissionNo: "N° Matricule",
  className: 'Classe',
  academicYear: 'Année Scolaire',
  term: 'Trimestre',
  subject: 'Matière',
  ca: 'Devoirs',
  exam: 'Composition',
  average: 'Moyenne',
  coefficient: 'Coef.',
  position: 'Rang',
  total: 'Total',
  overallAverage: 'Moyenne Générale',
  rank: 'Rang dans la classe',
  grade: 'Note',
  remark: 'Appréciation',
  conduct: 'Conduite',
  attendance: 'Assiduité',
  teacherComment: "Appréciation de l'enseignant",
  headTeacherComment: 'Appréciation du Directeur',
  promotionDecision: 'Décision',
  promoted: 'ADMIS(E)',
  repeat: 'REDOUBLE',
  pending: 'EN ATTENTE',
  signature: 'Signature',
  classTeacher: 'Enseignant(e)',
  headTeacher: 'Le Directeur',
  outOf: 'sur',
  idCardTitle: "CARTE D'IDENTITÉ SCOLAIRE",
  emergencyContact: "Contact d'urgence",
  receiptTitle: 'REÇU DE PAIEMENT',
  receiptNo: 'N° Reçu',
  date: 'Date',
  amountPaid: 'Montant Payé',
  paymentMethod: 'Mode de Paiement',
  reference: 'Référence',
  balance: 'Solde',
  received: 'Reçu avec remerciements',
  principalSignature: 'Signature & Cachet du Directeur',
  feeType: 'Type de Frais'
}

export function termsFor(subsystem: Subsystem): PdfTerms {
  return subsystem === 'francophone' ? FR : EN
}
