import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/client";
import LaurelDivider from "../components/Elements/LaurelDivider";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const purchaseOrderId = params.get("purchaseOrderId");
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!purchaseOrderId) return;
    // The webhook (server-to-server) is the source of truth for whether the
    // enrollment was actually created — this just polls that status rather
    // than trusting the redirect itself, per the spec's payment design.
    const poll = setInterval(async () => {
      const { data } = await api.get(`/payments/${purchaseOrderId}/status`);
      setStatus(data.status);
      if (data.status !== "pending") clearInterval(poll);
    }, 2000);
    return () => clearInterval(poll);
  }, [purchaseOrderId]);

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <LaurelDivider />
      {status === "checking" || status === "pending" ? (
        <p className="mt-6">Confirming your payment…</p>
      ) : status === "paid" ? (
        <>
          <h1 className="text-2xl mt-6">You're enrolled!</h1>
          <Link to="/dashboard" className="text-brand underline mt-4 inline-block">Go to My Courses</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl mt-6">Payment failed</h1>
          <Link to="/courses" className="text-brand underline mt-4 inline-block">Back to Courses</Link>
        </>
      )}
    </div>
  );
}
