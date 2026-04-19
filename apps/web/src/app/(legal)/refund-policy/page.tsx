export const metadata = { title: "Refund Policy | SKT Mart" };

export default function Page() {
  return (
    <article>
      <h1>Refund Policy</h1>

      <h2>1. When do we issue a refund?</h2>
      <ul>
        <li>Order cancelled by you before shipment.</li>
        <li>Order cancelled by the seller or SKT Mart due to unavailability.</li>
        <li>Successful return pickup and quality check of an eligible item.</li>
        <li>Failed delivery or undeliverable address after 3 attempts.</li>
      </ul>

      <h2>2. Refund Method</h2>
      <p>Refunds are credited to the original payment source:</p>
      <ul>
        <li>
          <strong>UPI / Net Banking / Wallet:</strong> 3–5 business days to the paying account.
        </li>
        <li>
          <strong>Credit/Debit Card:</strong> 5–7 business days to the card.
        </li>
        <li>
          <strong>SKT Wallet:</strong> Instant credit, usable on your next order.
        </li>
        <li>
          <strong>SKT SuperCoins / Gift Card:</strong> Instant credit to your wallet.
        </li>
      </ul>

      <h2>3. Partial Refunds</h2>
      <p>
        In cases where only part of an order is returned, we refund the pro-rated amount for the
        returned items minus any coupon or discount originally applied to those items.
      </p>

      <h2>4. Cancellation by SKT Mart</h2>
      <p>
        SKT Mart reserves the right to cancel orders in case of pricing errors, suspected fraud,
        non-serviceable pincodes, or breaches of our Terms. A full refund is processed
        automatically.
      </p>

      <h2>5. Disputes</h2>
      <p>
        If a refund is not received within 10 business days, please contact{" "}
        <a href="mailto:refunds@sktmart.com">refunds@sktmart.com</a> with your order number and a
        copy of the original payment confirmation.
      </p>

      <h2>6. Reversal to a Different Bank Account</h2>
      <p>
        Refunds cannot be redirected to a different bank account. If your original card/account is
        no longer active, contact your bank — refunds to closed cards are typically held in your
        bank's suspense account for 90 days.
      </p>
    </article>
  );
}
