import React, { useState, useEffect } from "react";
import { Button } from "../../../../shared/components/ui";
import patientService from "../../services/patient.service";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  Loader,
  Plus,
} from "lucide-react";

export function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    doctorName: "",
    hospitalName: "",
    prescriptionDate: "",
    medications: "",
    notes: "",
    file: null,
  });

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPrescriptions();
      setPrescriptions(response.data?.prescriptions || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load prescriptions");
      console.error("[PRESCRIPTIONS PAGE]", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      file: e.target.files[0],
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!formData.file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formDataToSend = new FormData();
      formDataToSend.append("file", formData.file);
      formDataToSend.append("doctorName", formData.doctorName);
      formDataToSend.append("hospitalName", formData.hospitalName);
      formDataToSend.append("prescriptionDate", formData.prescriptionDate);
      formDataToSend.append("medications", formData.medications);
      formDataToSend.append("notes", formData.notes);

      await patientService.uploadPrescription(formDataToSend);

      setSuccess("Prescription uploaded successfully!");
      setFormData({
        doctorName: "",
        hospitalName: "",
        prescriptionDate: "",
        medications: "",
        notes: "",
        file: null,
      });
      setShowUploadForm(false);

      // Reload prescriptions
      loadPrescriptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to upload prescription"
      );
      console.error("[PRESCRIPTION UPLOAD]", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (prescriptionId) => {
    if (
      window.confirm("Are you sure you want to delete this prescription?")
    ) {
      try {
        await patientService.deletePrescription(prescriptionId);
        setPrescriptions((prev) =>
          prev.filter((p) => p.id !== prescriptionId)
        );
        setSuccess("Prescription deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to delete prescription");
        console.error("[PRESCRIPTION DELETE]", err);
      }
    }
  };

  const handleDownload = async (prescriptionId) => {
    try {
      const response = await patientService.downloadPrescription(
        prescriptionId
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${prescriptionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download prescription");
      console.error("[PRESCRIPTION DOWNLOAD]", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <FileText size={32} />
                My Prescriptions
              </h1>
              <p className="text-gray-600">Upload and manage your prescriptions</p>
            </div>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={20} />
              Upload Prescription
            </button>
          </div>
        </div>

        <div className="px-6 max-w-7xl mx-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="text-green-600 flex-shrink-0 mt-0.5">✓</div>
              <div>
                <p className="font-semibold text-green-900">{success}</p>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Upload New Prescription
              </h2>
              <form onSubmit={handleUpload} className="space-y-6">
                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doctor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor Name
                    </label>
                    <input
                      type="text"
                      name="doctorName"
                      value={formData.doctorName}
                      onChange={handleInputChange}
                      placeholder="Enter doctor's name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Hospital Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hospital/Clinic Name
                    </label>
                    <input
                      type="text"
                      name="hospitalName"
                      value={formData.hospitalName}
                      onChange={handleInputChange}
                      placeholder="Enter hospital/clinic name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Prescription Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prescription Date
                    </label>
                    <input
                      type="date"
                      name="prescriptionDate"
                      value={formData.prescriptionDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload File
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id="fileInput"
                      />
                      <label
                        htmlFor="fileInput"
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Upload size={18} className="text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            {formData.file
                              ? formData.file.name
                              : "Choose file..."}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medications (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="medications"
                      value={formData.medications}
                      onChange={handleInputChange}
                      placeholder="E.g., Aspirin 500mg, Paracetamol 650mg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Add any notes about the prescription..."
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    ></textarea>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Upload Prescription
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Prescriptions List */}
          <div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-white rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {prescription.doctorName ? `Dr. ${prescription.doctorName}` : "Prescription"}
                        </h3>
                        {prescription.hospitalName && (
                          <p className="text-sm text-gray-600 mt-1">
                            {prescription.hospitalName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(prescription.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(prescription.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {prescription.prescriptionDate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} />
                          {new Date(prescription.prescriptionDate).toLocaleDateString()}
                        </div>
                      )}

                      {prescription.medications && (
                        <div className="mt-3">
                          <p className="font-medium text-gray-700 mb-1">
                            Medications:
                          </p>
                          <p className="text-gray-600">
                            {prescription.medications}
                          </p>
                        </div>
                      )}

                      {prescription.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="font-medium text-gray-700 mb-1">
                            Notes:
                          </p>
                          <p className="text-gray-600 text-sm">
                            {prescription.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg">
                <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Prescriptions Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start by uploading your first prescription
                </p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Upload Prescription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default PrescriptionsPage;
