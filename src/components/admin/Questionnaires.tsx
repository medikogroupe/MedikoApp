"use client";

import { useState } from "react";
import QcmSessions from "@/components/admin/QcmSessions";
import QuestionnaireEditor from "@/components/admin/QuestionnaireEditor";

export default function Questionnaires() {
  const [cle, setCle] = useState(0);
  return (
    <div>
      <div className="mt-4">
        <QuestionnaireEditor onCreated={() => setCle((c) => c + 1)} />
      </div>
      <QcmSessions key={cle} />
    </div>
  );
}