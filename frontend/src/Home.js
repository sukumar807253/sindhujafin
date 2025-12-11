
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImage";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaArrowRotateRight } from "react-icons/fa6";


export default function LoanApplicationFlow() {
  const [step, setStep] = useState(1);

  // Centers & Members
  const [centers, setCenters] = useState([]);
  const [centerName, setCenterName] = useState("");
  const [members, setMembers] = useState([]);
  const [memberName, setMemberName] = useState("");
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const [loanStep, setLoanStep] = useState(1);

  // Capitalizes the first letter of each word
  const capitalizeWords = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };


  // Loan form
  const initialLoanForm = {
    memberCibil: "",
    personName: "",
    dateofbirth: "",
    gender: "",
    religion: "",
    maritalStatus: "",
    aadharNo: "",
    memberwork: "",
    annualIncome: "",
    // nominee

    nomineeName: "",
    nomineeDob: "",
    nomineeRelationship: "",
    nomineeGender: "",
    nomineeReligion: "",
    nomineeMaritalStatus: "",
    nomineeBusiness: "",
    // contect
    mobileNo: "",
    nomineeMobile: "",
    memberEmail: "",
    address: "",
    pincode: "",

    // Files
    memberAadhaarFront: null,
    memberAadhaarBack: null,
    nomineeAadhaarFront: null,
    nomineeAadhaarBack: null,
    panCard: null,
    formImage: null,
    signature: null,
    memberPhoto: null,
    passbookImage: null,
  };

  const [loanForm, setLoanForm] = useState(initialLoanForm);
  const API = axios.create({ baseURL: "http://localhost:8081" });



  // Cropper States
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [currentFileName, setCurrentFileName] = useState("");

  // FETCH CENTERS
 const fetchCenters = useCallback(async () => {
  try {
    const { data } = await axios.get("http://localhost:8081/centers");
    const deletedCenters = JSON.parse(localStorage.getItem("deletedCenters") || "[]");

    const mapped = Array.isArray(data)
      ? data
          .map((c) => ({
            id: c.id ?? c.center_id ?? c.centerId,
            name: c.name ?? c.centerName ?? c.center_name,
          }))
          .filter((c) => !deletedCenters.includes(c.id))
      : [];

    setCenters(mapped);
  } catch (err) {
    console.error("Error fetching centers:", err);
    alert("Error fetching centers");
  }
}, []);



  // FETCH MEMBERS
  const fetchMembers = useCallback(async (centerId) => {
    if (!centerId) return setMembers([]);

    try {
      const { data } = await API.get(`/members/${centerId}`);
      const deletedMembers = JSON.parse(localStorage.getItem("deletedMembers") || "[]");

      const mapped = Array.isArray(data)
        ? data
          .map((m) => ({
            id: m.id ?? m.member_id ?? m.memberId,
            name: m.name ?? m.memberName ?? m.member_name,
          }))
          .filter((m) => !deletedMembers.includes(m.id))
        : [];

      setMembers(mapped);
    } catch (err) {
      alert("Error fetching members");
    }
  }, []); // no warning


  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  useEffect(() => {
    if (selectedCenter) fetchMembers(selectedCenter);
  }, [selectedCenter]);


  

  // ADD CENTER
 const addCenter = async () => {
  if (!centerName.trim()) {
    alert("Enter Center Name");
    return;
  }

  // Format: First letter uppercase, rest same
  const formattedName =
    centerName.trim().charAt(0).toUpperCase() + centerName.trim().slice(1);

  // Duplicate check (case-insensitive)
  const safeName = formattedName.toLowerCase();
  const nameExists = centers.some(
    (c) => (c?.name || "").toLowerCase().trim() === safeName
  );

  if (nameExists) {
    alert("Center already exists");
    return;
  }

  try {
    // Send to backend
    const res = await axios.post("http://localhost:8081/centers", {
      name: formattedName,
    });

    // Map backend response (your own mapping)
    const newCenter = {
      id: res.data.id ?? res.data.center_id ?? res.data.centerId,
      name: res.data.name ?? res.data.centerName ?? res.data.center_name,
    };

    // Show immediately in UI
    setCenters((prev) => [...prev, newCenter]);

    // Clear input
    setCenterName("");
  } catch (err) {
    console.error("Error adding center:", err);
    alert("Failed to add center");
  }
};

  // ADD MEMBER
  const addMember = async () => {
    if (!memberName.trim()) return alert("Enter member name");

    const capitalizedMember = capitalizeWords(memberName.trim());

    try {
      const res = await API.post("/members", {
        name: capitalizedMember,
        center_id: selectedCenter,
      });

      const newMember = { id: res.data.id, name: capitalizedMember };
      setMembers((prev) => [...prev, newMember]);
      setMemberName("");
      setStep(2);
      setSelectedMember(null);

    } catch {
      alert("Error adding member");
    }
  };



  // INPUT CHANGE
  const handleLoanChange = (e) => {
    const { name, value } = e.target;
    const capitalizeFields = [
      "personName",
      "memberwork",
      "nomineeName",
      "nomineeBusiness",
      "address",
    ];

    const newValue = capitalizeFields.includes(name) ? capitalizeWords(value) : value;

    setLoanForm((prev) => ({ ...prev, [name]: newValue }));
  };


  // FILE SELECT + CROP
  const handleFileSelect = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setCurrentFileName(key);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    } else {
      setLoanForm((p) => ({ ...p, [key]: file }));
    }
  };

  const onCropComplete = useCallback((_, croppedArea) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const saveCroppedImage = async () => {
    try {
      if (!croppedAreaPixels) return alert("Crop area not selected");

      const croppedUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation);
      const blob = await fetch(croppedUrl).then((r) => r.blob());
      const file = new File([blob], `${currentFileName}.png`, { type: blob.type });

      setLoanForm((prev) => ({ ...prev, [currentFileName]: file }));

      // Reset cropper state
      setShowCropper(false);
      setCropImageSrc(null);
      setCroppedAreaPixels(null);
      setCurrentFileName("");
    } catch {
      alert("Error cropping image");
    }
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
    setCurrentFileName("");
  };

  // SUBMIT LOAN
  const handleLoanSubmit = async () => {
    try {
      if (!selectedMember) return alert("Select member first");

      // Example required fields
      const requiredFields = [
        "memberCibil",
        "personName",
        "dateofbirth",
        "gender",
        "religion",
        // "maritalStatus",
        // "aadharNo",
        // " memberwork",
        // "annualIncome",
        // " nomineeName",
        // "nomineeDob",
        // "nomineeRelationship",
        // "nomineeGender",
        // "nomineeReligion",
        // "nomineeMaritalStatus",
        // "nomineeBusiness",
        // "mobileNo",
        // " nomineeMobile",
        // "address",
        // "pincode",
        // "memberAadhaarFront",
        // " memberAadhaarBack",
        // "nomineeAadhaarFront",
        // "nomineeAadhaarBack",
        // "panCard",
        // "formImage",
        // "signature",
        // "memberPhoto",
        // "passbookImage",
      ];

      for (let field of requiredFields) {
        if (!loanForm[field] || loanForm[field].toString().trim() === "") {
          return alert(`Please fill ${field}`);
        }
      }

      const FD = new FormData();
      Object.entries(loanForm).forEach(([k, v]) => {
        if (v !== null && v !== "") FD.append(k, v);
      });
      FD.append("memberId", selectedMember);
      FD.append("centerId", selectedCenter);

      await API.post("/loans", FD, { headers: { "Content-Type": "multipart/form-data" } });

      alert("Loan Submitted Successfully ✔");

      setLoanForm(initialLoanForm);
      setLoanStep(1);
      setStep(1);
      setSelectedCenter(null);
      setSelectedMember(null);
    } catch {
      alert("Error submitting loan");
    }
  };


  const styles = {
    container: { maxWidth: 900, margin: "18px auto", padding: 20 },
    heading: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
    input: { width: "100%", padding: 10, marginBottom: 10, borderRadius: 6, border: "1px solid #ccc" },
    btn: { padding: "8px 14px", background: "#1d4ed8", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer" },
    btnGreen: { background: "#059669" },
  };
  const deleteCenterUI = (id) => {
    if (!window.confirm("Are you sure you want to remove this center?")) return;

    // Remove from state
    setCenters((prev) => prev.filter(c => c.id !== id));

    // Save deleted IDs in localStorage
    const deletedCenters = JSON.parse(localStorage.getItem("deletedCenters") || "[]");
    if (!deletedCenters.includes(id)) {
      deletedCenters.push(id);
      localStorage.setItem("deletedCenters", JSON.stringify(deletedCenters));
    }

    alert("Confirm Delete");
  };

  const deleteMemberUI = (id) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    // Remove from state
    setMembers((prev) => prev.filter((m) => m.id !== id));

    // Save deleted IDs in localStorage
    const deletedMembers = JSON.parse(localStorage.getItem("deletedMembers") || "[]");
    if (!deletedMembers.includes(id)) {
      deletedMembers.push(id);
      localStorage.setItem("deletedMembers", JSON.stringify(deletedMembers));
    }

    alert("Member removed ");
  };


  return (
    <div style={styles.container}>
      {/* STEP 1: Centers */}
      {step === 1 && (
        <>
          <h2 style={styles.heading}>Centers</h2>
          <input
            style={styles.input}
            placeholder="Center name"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
          />
          <button style={styles.btn} onClick={addCenter}>Add Center</button>
          <hr />

          {centers.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 10,
                background: "#f6f6f6",
                margin: "8px 0",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <span>{c.name}</span>

              <div>
                <button
                  style={{ ...styles.btn, marginRight: 10 }}
                  onClick={() => { setSelectedCenter(c.id); setStep(2); }}
                >
                  Open →
                </button>

                <button
                  style={{ ...styles.btn, background: "#dc2626" }}
                  onClick={() => deleteCenterUI(c.id)}
                >
                  Delete
                </button>

              </div>
            </div>
          ))}

        </>
      )}


      {/* STEP 2: Members */}
      {step === 2 && (
        <>
          <h2 style={styles.heading}>Members</h2>

          <input
            style={styles.input}
            placeholder="Member name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />

          <button style={styles.btn} onClick={addMember}>Add Member</button>
          <hr />

          {members.length === 0 && (
            <p style={{ color: "gray" }}>No members found in this center.</p>
          )}

          {members.map((m) => (
            <div
              key={m.id}
              style={{
                padding: 10,
                background: "#f6f6f6",
                margin: "8px 0",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <span>{m.name}</span>

              <div>
                <button
                  style={{ ...styles.btn, marginRight: 10 }}
                  onClick={() => {
                    setSelectedMember(m.id);
                    setStep(4);   // AUTO CLOSE member page
                  }}
                >
                  Select →
                </button>


                <button
                  style={{ ...styles.btn, background: "#dc2626" }}
                  onClick={() => deleteMemberUI(m.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <button style={{ ...styles.btn, marginTop: 10 }} onClick={() => setStep(1)}>
            ← Back
          </button>
        </>
      )}


      {/* STEP 3: Confirm Member */}
      {step === 3 && (
        <>
          <h2 style={styles.heading}>Select Member</h2>
          <select style={styles.input} value={selectedMember || ""} onChange={(e) => setSelectedMember(e.target.value)}>
            <option value="">-- select member --</option>
            {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          <button style={styles.btn} onClick={() => setStep(2)}>← Back</button>
          <button style={{ ...styles.btn, marginLeft: 10 }} disabled={!selectedMember} onClick={() => setStep(4)}>Next →</button>
        </>
      )}

      {/* STEP 4: Loan Form */}
      {step === 4 && (
        <>
          <h2 style={styles.heading}>Loan Application</h2>

          {/* loanStep 1: Personal */}
          {loanStep === 1 && (
            <>
              <input
                style={styles.input}
                name="memberCibil"
                placeholder="Member CIBIL (3 digits)"
                value={loanForm.memberCibil}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length > 3) val = val.slice(0, 3);
                  setLoanForm({ ...loanForm, memberCibil: val });
                }}
                required
              />

              <input style={styles.input} name="personName" placeholder="Full Name" value={loanForm.personName} onChange={handleLoanChange} required />


              <input type="date" style={styles.input} name="dateofbirth" value={loanForm.dateofbirth} onChange={handleLoanChange} required />
              <select
                style={styles.input}
                name="gender"
                value={loanForm.gender}
                onChange={handleLoanChange}
                required
              >
                <option value="">Select Gender (Optional)</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <select
                style={styles.input}
                name="religion"
                value={loanForm.religion}
                onChange={handleLoanChange}
                required
              >
                <option value="">Select Religion (Optional)</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Other">Other</option>
              </select>

              <select
                style={styles.input}
                name="maritalStatus"
                value={loanForm.maritalStatus}
                onChange={handleLoanChange}
                required
              >
                <option value="">Select Marital Status (Optional)</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>

              <input
                style={styles.input}
                name="aadharNo"
                placeholder="Aadhaar Number"
                value={loanForm.aadharNo}
                onChange={(e) => {

                  let value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  value = value.replace(/(.{4})/g, "$1 ").trim();
                  setLoanForm({ ...loanForm, aadharNo: value });
                }}
                required
              />

              <input
                style={styles.input}
                name="memberwork"
                placeholder=" Work / Business"
                value={loanForm.memberwork}
                onChange={handleLoanChange}
                required
              />

              <input
                style={styles.input}
                name="annualIncome"
                type="number"
                placeholder="Annual Income"
                value={loanForm.annualIncome}
                onChange={handleLoanChange}
                required
              />


              <button style={styles.btn} onClick={() => setLoanStep(2)}>Next →</button>
            </>
          )}

          {/* loanStep 2: Nominee */}
          {loanStep === 2 && (
            <>
              <input style={styles.input} name="nomineeName" placeholder="Nominee Name" value={loanForm.nomineeName} onChange={handleLoanChange} required />
              <input type="date" style={styles.input} name="nomineeDob" value={loanForm.nomineeDob} onChange={handleLoanChange} required />


              <select
                style={styles.input}
                name="nomineeRelationship"
                value={loanForm.nomineeRelationship}
                onChange={handleLoanChange}
                required
              >
                <option value="">Select Relationship (Optional)</option>
                <option value="Daughter">Daughter</option>
                <option value="Son">Son</option>
                <option value="Husband">Husband</option>
              </select>


              <select
                style={styles.input}
                name="nomineeGender"
                value={loanForm.nomineeGender}
                onChange={handleLoanChange}
                required
              >
                <option value="">Select Gender (Optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <select
                style={styles.input}
                name="nomineeReligion"
                value={loanForm.nomineeReligion}
                onChange={handleLoanChange} required
              >
                <option value="">Select Religion (Optional)</option>
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Christian">Christian</option>
                <option value="Sikh">Sikh</option>
                <option value="Other">Other</option>
              </select>

              <select
                style={styles.input}
                name="nomineeMaritalStatus"
                value={loanForm.nomineeMaritalStatus}
                onChange={handleLoanChange} required
              >
                <option value="">Select Marital Status (Optional)</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>

              <input
                style={styles.input}
                name="nomineeBusiness"
                placeholder="Nominee Work / Business"
                value={loanForm.nomineeBusiness}
                onChange={handleLoanChange}
                required
              />



              <button style={styles.btn} onClick={() => setLoanStep(1)}>← Back</button>
              <button style={{ ...styles.btn, marginLeft: 10 }} onClick={() => setLoanStep(3)}>Next →</button>
            </>
          )}

          {/* loanStep 3: Contact */}
          {loanStep === 3 && (
            <>
              <input
                style={styles.input}
                name="mobileNo"
                placeholder="Member Mobile No"
                value={loanForm.mobileNo}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setLoanForm((p) => ({ ...p, mobileNo: v }));
                }}
                required
              />

              <input
                style={styles.input}
                name="nomineeMobile"
                placeholder="Nominee Mobile No"
                value={loanForm.nomineeMobile}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setLoanForm((p) => ({ ...p, nomineeMobile: v }));  // FIXED
                }}
                required
              />

              <input style={styles.input} name="memberEmail" placeholder="Email" value={loanForm.Email} onChange={handleLoanChange} />

              <textarea
                style={styles.input}
                name="address"
                placeholder="Full Address"
                value={loanForm.address}
                onChange={handleLoanChange}
                rows={3}
                required
              />


              <input
                style={styles.input}
                name="pincode"
                placeholder="Pincode"
                maxLength={6}
                value={loanForm.pincode}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/\D/g, ""); // only numbers
                  setLoanForm({ ...loanForm, pincode: onlyNums });
                }}
                required
              />





              <button style={styles.btn} onClick={() => setLoanStep(2)}>← Back</button>
              <button style={{ ...styles.btn, marginLeft: 10 }} onClick={() => setLoanStep(4)}>Next →</button>
            </>
          )}

          {/* loanStep 4: Uploads */}
          {loanStep === 4 && (
            <>
              <h3>Upload Documents</h3>
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
              ].map((f) => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label>{f.label}</label>

                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    required   // ✅ make input required
                    onChange={(e) => handleFileSelect(e, f.key)}
                  />

                  <span style={{ color: loanForm[f.key] ? "green" : "red" }}>
                    {loanForm[f.key] ? "✔ Selected" : "✘ Not Selected"}
                  </span>
                </div>
              ))}


              {/* CROP TOOL */}
              {showCropper && cropImageSrc && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.7)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "90%",
                      maxWidth: 500,
                      height: 500,
                      background: "#fff",
                      padding: 20,
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ flex: 1, position: "relative" }}>
                      <Cropper
                        image={cropImageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}        // 1:1 crop
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        showGrid={true}   // optional: show grid lines
                      />
                    </div>

                    {/* Zoom Slider */}
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      style={{ width: "100%", margin: "10px 0" }}
                    />

                    {/* Rotate Buttons */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, gap: 10 }}>
                      <button
                        style={styles.btn}
                        onClick={() => setRotation((prev) => prev - 90)}
                      >
                        <FaArrowRotateLeft />
                      </button>
                      <button
                        style={styles.btn}
                        onClick={() => setRotation((prev) => prev + 90)}
                      >
                        <FaArrowRotateRight />
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button style={styles.btn} onClick={saveCroppedImage}>
                        Save Crop
                      </button>
                      <button
                        style={{ ...styles.btn, background: "#777", marginLeft: 10 }}
                        onClick={cancelCrop}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}



              <button style={styles.btn} onClick={() => setLoanStep(3)}>← Back</button>
              <button style={{ ...styles.btn, ...styles.btnGreen, marginLeft: 10 }} onClick={handleLoanSubmit}>Submit Loan ✔</button>
            </>
          )}
        </>
      )}
    </div>
  );
}
