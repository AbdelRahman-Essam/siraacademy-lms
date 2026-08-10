import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import NavBar from '../components/NavBar'

/**
 * Paymob redirects the student here after checkout (configure this as
 * the "Transaction Response Callback" URL in your Paymob integration
 * settings, e.g. https://yourapp.com/payments/result). Paymob's own
 * redirect isn't authoritative — the webhook (payments/webhook/) is
 * what actually marks the order paid, and it can land a moment after
 * the redirect. So this page polls our backend for the real status
 * instead of trusting the URL's own "success" query param.
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('merchant_order_id')
  const [order, setOrder] = useState(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!orderId) return
    if (order?.status === 'paid' || order?.status === 'failed') return
    if (attempts > 15) return // ~30s of polling, then give up waiting

    const timer = setTimeout(async () => {
      const { data } = await client.get(`/payments/${orderId}/`)
      setOrder(data)
      setAttempts((a) => a + 1)
    }, 2000)

    return () => clearTimeout(timer)
  }, [orderId, order, attempts])

  return (
    <div className="min-h-screen bg-parchment">
      <NavBar />
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        {!orderId ? (
          <p className="text-ink/60">No payment reference found.</p>
        ) : order?.status === 'paid' ? (
          <>
            <p className="text-3xl mb-3">✓</p>
            <h1 className="font-display text-2xl text-ink mb-2">Payment successful</h1>
            <p className="text-ink/60 mb-6">You're now enrolled in {order.course_title}.</p>
            <Link to={`/courses/${order.course}`} className="inline-block bg-brand hover:bg-brand-light text-white rounded px-5 py-2 text-sm">
              Go to course
            </Link>
          </>
        ) : order?.status === 'failed' ? (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Payment failed</h1>
            <p className="text-ink/60 mb-6">Your payment couldn't be completed. No charge was enrolled.</p>
            <Link to="/courses" className="inline-block bg-brand hover:bg-brand-light text-white rounded px-5 py-2 text-sm">
              Back to courses
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Confirming payment...</h1>
            <p className="text-ink/60">This usually takes a few seconds.</p>
          </>
        )}
      </div>
    </div>
  )
}
