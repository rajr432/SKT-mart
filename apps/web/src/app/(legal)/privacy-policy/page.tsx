export const metadata = { title: "Privacy Policy | SKT Mart" };

export default function Page() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last updated:</strong> {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
      </p>
      <p>
        This Privacy Policy describes how SKT Mart Internet Private Limited ("SKT Mart", "we",
        "our", "us") collects, uses, processes, and discloses your information when you use our
        website <strong>www.sktmart.com</strong>, mobile applications, or any related services
        (collectively, the "Platform"). By using the Platform, you agree to the collection and use
        of information in accordance with this Policy.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>1.1 Personal Information You Provide</h3>
      <ul>
        <li>Name, email address, phone number, date of birth, and gender</li>
        <li>Delivery addresses, billing addresses, and pincodes</li>
        <li>Payment details (processed by PCI-DSS compliant gateways; we do not store full card numbers)</li>
        <li>Profile photo, reviews, ratings, and other user-generated content</li>
        <li>Communications with customer support</li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li>Device information (model, OS version, unique device identifiers)</li>
        <li>IP address, browser type, referring URLs, pages visited, and clickstream data</li>
        <li>Location (approximate, derived from IP and pincode)</li>
        <li>Cookies and similar tracking technologies</li>
      </ul>

      <h3>1.3 Information from Third Parties</h3>
      <p>
        We may receive information from social login providers, sellers on the marketplace,
        logistics partners, and analytics providers.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and manage your account and authenticate access</li>
        <li>To process orders, payments, shipments, returns, and refunds</li>
        <li>To personalize your shopping experience and provide recommendations</li>
        <li>To detect and prevent fraud, abuse, and security incidents</li>
        <li>To communicate offers, updates, and service announcements (you can opt out)</li>
        <li>To comply with legal obligations, court orders, or government requests</li>
      </ul>

      <h2>3. Sharing and Disclosure</h2>
      <p>We share information with:</p>
      <ul>
        <li>
          <strong>Sellers:</strong> Name, delivery address, and phone number for order fulfillment.
        </li>
        <li>
          <strong>Logistics partners:</strong> Shipping and contact details required to deliver
          your orders.
        </li>
        <li>
          <strong>Payment processors:</strong> Razorpay, Cashfree, and banks for processing
          payments.
        </li>
        <li>
          <strong>Service providers:</strong> Cloud hosting, analytics, SMS and email providers —
          bound by confidentiality.
        </li>
        <li>
          <strong>Legal / regulatory authorities</strong> when required by applicable Indian law.
        </li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>4. Cookies and Tracking</h2>
      <p>
        We use cookies to remember preferences, keep you logged in, and understand how you use the
        Platform. You can disable cookies in your browser settings; some features may not work
        without them.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain personal information for as long as your account is active, as required to
        provide services, to resolve disputes, enforce our agreements, and comply with our legal
        obligations under Indian law (including the Income Tax Act, 1961 and the Consumer
        Protection Act, 2019).
      </p>

      <h2>6. Your Rights</h2>
      <p>Subject to applicable law (including the DPDP Act, 2023), you have the right to:</p>
      <ul>
        <li>Access, correct, or update your personal information</li>
        <li>Request deletion of your account and associated data</li>
        <li>Withdraw consent for marketing communications</li>
        <li>Port your data to another service in a structured format</li>
        <li>Lodge a complaint with the Data Protection Board of India</li>
      </ul>
      <p>
        To exercise these rights, email <a href="mailto:privacy@sktmart.com">privacy@sktmart.com</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We implement industry-standard safeguards including TLS encryption in transit, encrypted
        passwords (bcrypt), PCI-DSS compliant payment processing, and least-privilege access
        controls. No system is 100% secure; in the event of a breach, we will notify affected
        users and the Data Protection Board as required.
      </p>

      <h2>8. Children</h2>
      <p>
        The Platform is not intended for children under 18. We do not knowingly collect personal
        information from minors. If you believe a minor has provided us personal information,
        contact us and we will delete it.
      </p>

      <h2>9. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be notified via email
        or a prominent notice on the Platform at least 7 days before they take effect.
      </p>

      <h2>10. Grievance Officer</h2>
      <p>
        In accordance with the Information Technology Act, 2000 and the rules thereunder:
        <br />
        <strong>Name:</strong> Grievance Officer, SKT Mart<br />
        <strong>Email:</strong> <a href="mailto:grievance@sktmart.com">grievance@sktmart.com</a>
        <br />
        <strong>Address:</strong> Block A, 4th Floor, Tower 1, Cyber Corridor, Bengaluru,
        Karnataka 560103
      </p>
    </article>
  );
}
