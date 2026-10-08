import { useState } from "react";
import CSRTable from '../../pages/dashboard/CSRTable';
import CSRDetailView from '../layout/CSRDetailView';

export default function CSRManagement() {
  const [selectedCsr, setSelectedCsr] = useState(null);

  return (
    <div className="h-full">
      {selectedCsr ? (
        <CSRDetailView
          csr={selectedCsr}
          onBack={() => setSelectedCsr(null)}
        />
      ) : (
        <CSRTable onSelect={(item) => setSelectedCsr(item)} />
      )}
    </div>
  );
}