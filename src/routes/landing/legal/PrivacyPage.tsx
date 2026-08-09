import { LegalPage, LegalSection } from '@/components/layout/LegalPage';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';

export function PrivacyPage() {
  usePageMeta('Privacy policy', 'How AC7 GROUP collects, uses and protects your personal data.');

  return (
    <LegalPage
      title="Privacy policy"
      updated="2 August 2026"
      intro="What we collect, why we collect it, and what you can ask us to do with it."
    >
      <LegalSection heading="Who we are">
        <p>
          GALEYR is a food delivery service operating in {env.market.city},{' '}
          {env.market.country}, run by {env.company.name} ({env.company.meaning}). We are
          responsible for the information described here.
        </p>
        <p>
          <strong>
            This policy is being rewritten for the delivery service and is not final.
          </strong>{' '}
          Parts of it still describe our transport business. If anything here matters to a
          decision you are making, call the control room and ask — we would rather answer
          than have you rely on a page we have told you is out of date.
        </p>
        <p>
          For any privacy question, contact{' '}
          <a href={`mailto:${env.controlCentre.email}`}>{env.controlCentre.email}</a> or call the
          control centre on <a href={`tel:${env.controlCentre.tel}`}>{env.controlCentre.display}</a>.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <h3>When you book a journey</h3>
        <ul>
          <li>Your name, phone number and email address.</li>
          <li>Pickup and destination addresses, and the times of your journeys.</li>
          <li>Payment records — we never store full card numbers ourselves.</li>
          <li>Ratings and any message you send a driver through the app.</li>
        </ul>

        <h3>When you drive for us</h3>
        <ul>
          <li>Licence and insurance details, and vehicle information.</li>
          <li>Your location while you are online, so we can offer you nearby work.</li>
          <li>Trip history, earnings and ratings.</li>
        </ul>

        <h3>School transport</h3>
        <p>
          For contracted school routes we hold the child's name, pickup point, school, and any
          medical or accessibility need the council or school has told us about. This information
          is only visible to the assigned driver, the route coordinator and the parent or guardian.
          It is <strong>never</strong> used for marketing and is never shared with advertisers.
        </p>
      </LegalSection>

      <LegalSection heading="Why we are allowed to hold it">
        <ul>
          <li>
            <strong>To perform our contract with you</strong> — we cannot send a car to an address
            we do not have.
          </li>
          <li>
            <strong>Legal obligation</strong> — licensing authorities require us to keep certain
            journey and driver records.
          </li>
          <li>
            <strong>Legitimate interests</strong> — preventing fraud, investigating complaints, and
            keeping drivers and passengers safe.
          </li>
          <li>
            <strong>Consent</strong> — for marketing messages and non-essential cookies, which you
            can withdraw at any time.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Who can see it">
        <p>
          A driver assigned to your journey sees your first name, pickup and destination, and your
          phone number only where the call is routed through our system. Other drivers see nothing.
        </p>
        <p>
          We use suppliers to run the service — hosting, payments and mapping. They act on our
          instructions and cannot use your data for their own purposes. We do not sell personal
          data, and advertisers on this site receive no personal information whatsoever.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <ul>
          <li>Journey and booking records: six years, for tax and licensing.</li>
          <li>Messages between riders and drivers: twelve months.</li>
          <li>School transport records: for the duration of the contract plus one year.</li>
          <li>Account details: until you close your account, then ninety days.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>Under UK GDPR you can ask us to:</p>
        <ul>
          <li>Give you a copy of the personal data we hold about you.</li>
          <li>Correct anything that is wrong.</li>
          <li>Delete your data, where we are not required by law to keep it.</li>
          <li>Stop using it for marketing, at any time.</li>
          <li>Send your data to another provider.</li>
        </ul>
        <p>
          Email <a href={`mailto:${env.controlCentre.email}`}>{env.controlCentre.email}</a> and we
          will respond within one month. If you are not satisfied you can complain to the
          Information Commissioner's Office at{' '}
          <a href="https://ico.org.uk" rel="noreferrer noopener">ico.org.uk</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Data is encrypted in transit and at rest. Access is restricted by role — an operator can
          see the bookings they are handling, not the whole database — and every administrative
          action is logged. Passwords are stored hashed and are never readable by our staff.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
