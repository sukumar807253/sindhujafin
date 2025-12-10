// src/LoanPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function LoanPage() {
  const API = axios.create({ baseURL: "http://localhost:8081" });
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [detailLoan, setDetailLoan] = useState(null);
  const [search, setSearch] = useState("");
  const [centerColors, setCenterColors] = useState({});

  // Format Loan ID safely
  const formatLoanId = (loan) => {
    return loan.loanId && loan.loanId.trim() !== ""
      ? loan.loanId
      : `LN-${String(loan.id).padStart(4, "0")}`;
  };

  // Random pastel color for centers
  const generateColor = () => {
    const r = Math.floor(Math.random() * 156 + 100);
    const g = Math.floor(Math.random() * 156 + 100);
    const b = Math.floor(Math.random() * 156 + 100);
    return `rgb(${r},${g},${b})`;
  };

  const assignCenterColors = (data) => {
    const newColors = { ...centerColors };
    data.forEach((loan) => {
      if (loan.centerName && !newColors[loan.centerName]) {
        newColors[loan.centerName] = generateColor();
      }
    });
    setCenterColors(newColors);
  };

  // Fetch all loans
  const fetchLoans = async () => {
    try {
      const res = await API.get("/loans");
      const normalized = (res.data || []).map((loan) => {
        const loanId =
          loan.loanId || loan.loanid || loan.LoanId || loan.loan_id || `LN-${String(loan.id).padStart(4, "0")}`;

        return {
          ...loan,
          loanId,
          memberName: loan.memberName || loan.memberCibil || "Unknown",
          centerName: loan.centerName || "Unknown",
          submittedAt: loan.submittedAt || loan.createdAt,
          status: loan.status || "pending",
          nomineeRelationship: loan.nomineeRelationship || loan.relation || "-",
          nomineeOccupation: loan.nomineeOccupation || loan.nomineeoccupation || "-",
        };
      });

      // Sort latest first
      normalized.sort((a, b) => {
        const numA = parseInt(a.loanId.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.loanId.replace(/\D/g, "")) || 0;
        return numB - numA;
      });

      setLoans(normalized);
      assignCenterColors(normalized);
    } catch (err) {
      console.error("Fetch loans error:", err);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Approve loan
  const approveLoan = async (id) => {
    try {
      await API.put(`/loan/status/${id}`, { status: "approved" });
      fetchLoans();
      if (detailLoan?.id === id) setDetailLoan({ ...detailLoan, status: "approved" });
    } catch {
      alert("❌ Approval failed");
    }
  };

  // Reject loan
  const rejectLoan = async (id) => {
    if (!window.confirm("Are you sure to REJECT this loan?")) return;
    try {
      await API.put(`/loan/status/${id}`, { status: "rejected" });
      fetchLoans();
      if (detailLoan?.id === id) setDetailLoan({ ...detailLoan, status: "rejected" });
    } catch {
      alert("❌ Reject failed");
    }
  };

  // Delete loan
  const deleteLoan = async (id) => {
    if (!window.confirm("Delete loan permanently?")) return;
    try {
      await API.delete(`/loan/${id}`);
      fetchLoans();
      setDetailLoan(null);
    } catch {
      alert("❌ Delete failed");
    }
  };

  // Status color helper
  const statusColor = (status) => {
    switch (status) {
      case "approved": return "green";
      case "rejected": return "red";
      default: return "orange";
    }
  };

  // Filtered loans based on search
  const filteredLoans = loans.filter((loan) => {
    const query = search.toLowerCase();
    return (
      formatLoanId(loan).toLowerCase().includes(query) ||
      (loan.memberName || "").toLowerCase().includes(query) ||
      (loan.centerName || "").toLowerCase().includes(query) ||
      (loan.personName || "").toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <h2 style={{ textAlign: "center" }}>Loan List</h2>

      <input
        type="text"
        placeholder="Search Loan ID, Member, Center 🔍"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "30%", padding: 10, marginBottom: 14, borderRadius: 5, border: "1px solid #aaa", fontSize: 16 }}
      />

      {/* Table */}
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#eee" }}>
          <tr>
            <th style={{ fontSize: 18 }}>Loan ID</th>
            <th>Center</th>
            <th>Member</th>
            <th>Submitted At</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredLoans.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>No Records Found</td>
            </tr>
          )}

          {filteredLoans.map((loan) => (
            <tr key={loan.id}>
              <td style={{ fontSize: 18, fontWeight: "bold" }}>{formatLoanId(loan)}</td>
              <td style={{ background: centerColors[loan.centerName] || "lightgray", padding: 6, borderRadius: 4, fontWeight: "bold", textAlign: "center" }}>
                {loan.centerName}
              </td>
              <td>{loan.memberName}</td>
              <td>{loan.submittedAt ? new Date(loan.submittedAt).toLocaleString("en-IN") : "-"}</td>
              <td style={{ color: statusColor(loan.status), fontWeight: "bold" }}>{loan.status}</td>
              <td>
                <button onClick={() => setDetailLoan(loan)}>Detail</button>{" "}
                <button style={{ background: "red", color: "#fff" }} onClick={() => deleteLoan(loan.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detail Popup */}
      {detailLoan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center",  alignItems: "flex-start", overflowY: "auto", padding: "20px 10px", zIndex: 9999 ,}}>
          <div style={{ background: "#fff", padding: 20, width: "90%", maxWidth: 1500, borderRadius: 8 , }}>
            <h1 style={{ textAlign: "center", fontSize: 36, margin: "0 0 20px", padding: 10, borderBottom: "3px solid #1976d2" }}>
              {formatLoanId(detailLoan)}
            </h1>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 30, padding: 30 }}>
              {/* Personal */}
              <div style={{ flex: 1, minWidth: 250}}>
                <h4 style={sectionTitle}>Personal Details</h4>
                <p><strong>Name:</strong> {detailLoan.personName}</p>
                <p><strong>Member CIBIL:</strong> {detailLoan.memberCibil}</p>
                <p>  <strong>DOB:</strong>{" "}  {detailLoan.dateofbirth ? detailLoan.dateofbirth.split("T")[0] : ""}</p>
                <p><strong>Gender:</strong> {detailLoan.gender}</p>
                <p><strong>Religion:</strong> {detailLoan.religion}</p>
                <p><strong>Marital Status:</strong> {detailLoan.maritalStatus}</p>
                <p><strong>Aadhaar:</strong> {detailLoan.aadharNo}</p>
              </div>

              {/* Nominee */}
              <div style={{ flex: 1, minWidth: 250 }}>
                <h4 style={sectionTitle}>Nominee Details</h4>
                <p><strong>Name:</strong> {detailLoan.nomineeName}</p>
                <p><strong>NomineeDob:</strong>{" "} {detailLoan.nomineeDob ? detailLoan.nomineeDob.split("T")[0] : ""}</p>
                <p><strong>Relation:</strong> {detailLoan.nomineeRelationship}</p>
                <p><strong>Gender:</strong> {detailLoan.nomineeGender}</p>
                <p><strong>Religion:</strong> {detailLoan.nomineeReligion}</p>
                <p><strong>Marital Status:</strong> {detailLoan.nomineeMaritalStatus}</p>
              <div style={{ flex: 1, minWidth: 250 }}>
                <h4 style={sectionTitle}>Income Details</h4>
                <p><strong>Member Work / Business:</strong> {detailLoan.memberwork}</p>
                <p><strong>AnnualIncome:</strong> {detailLoan.annualIncome}</p>
                <p><strong>Nominee Work / Business:</strong> {detailLoan.nomineeBusiness}</p>
              </div>
              </div>


              {/* Loan Info */}
              <div style={{ flex: 1, minWidth: 250}}>
                 <h4 style={sectionTitle}>Contect Detiles</h4>
                 <p><strong>Contact:</strong> {detailLoan.mobileNo }</p>
                 <p><strong>Nominee Contact:</strong> {detailLoan.nomineeMobile}</p>
                 <p><strong>MemberEmail:</strong> {detailLoan.memberEmail }</p>
                 <p><strong>Address:</strong> {detailLoan.address}</p>
                 <p><strong>Pincode:</strong> {detailLoan.pincode}</p>
                
                 <div style={{ flex: 1, minWidth: 250}}>
                   <h4 style={sectionTitle}>Status</h4>
                   <p><strong>Status:</strong> {detailLoan.status}</p>
                   <p><strong>Submitted At:</strong> {detailLoan.submittedAt ? new Date(detailLoan.submittedAt).toLocaleString("en-IN") : "-"}</p>

                  </div>
              </div>
            </div>

            {/* Documents */}
            <h4 style={{ marginTop: 20 }}>Uploaded Documents</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 10 }}>
              {[
                { key: "memberAadhaarFront", label: "Member Aadhaar Front" },
                { key: "memberAadhaarBack", label: "Member Aadhaar Back" },
                { key: "nomineeAadhaarFront", label: "Nominee Aadhaar Front" },
                { key: "nomineeAadhaarBack", label: "Nominee Aadhaar Back" },
                { key: "panCard", label: "PAN Card" },
                { key: "formImage", label: "Form Image" },
                { key: "signature", label: "Signature" },
                { key: "memberPhoto", label: "Member Photo" },
                { key: "passbookImage", label: "Passbook Image" },
                { key: "proof", label: "Proof Document" },
              ].map((f) => {
                const file = detailLoan[f.key];
                if (!file) return null;
                return (
                  <div key={f.key} style={{ background: "#f8f8f8", padding: 10, borderRadius: 6, boxShadow: "0 0 4px rgba(0,0,0,0.1)" }}>
                    <strong>{f.label}</strong>
                    <br />
                    <a href={`http://localhost:8081/uploads/${file}`} target="_blank" rel="noreferrer" style={{ color: "#1976d2", wordBreak: "break-word", display: "inline-block", marginTop: 5 }}>
                      {file}
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
              {detailLoan.status === "pending" && (
                <>
                  <button style={{ padding: "10px 20px", background: "green", color: "#fff", borderRadius: 6 }} onClick={() => approveLoan(detailLoan.id)}>
                    Approve
                  </button>
                  <button style={{ padding: "10px 20px", background: "orange", color: "#fff", borderRadius: 6 }} onClick={() => rejectLoan(detailLoan.id)}>
                    Reject
                  </button>
                </>
              )}
              <button style={{ padding: "10px 20px", background: "#333", color: "#fff", borderRadius: 6 }} onClick={() => setDetailLoan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Section title style
const sectionTitle = {
  border: "2px solid #1976d2",
  backgroundColor: "#2196f3",
  color: "#fff",
  padding: 5 ,
  borderRadius: 6,
  marginBottom: 5,

};
