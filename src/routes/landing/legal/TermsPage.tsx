import { LegalPage, LegalSection } from '@/components/layout/LegalPage';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';

export function TermsPage() {
  usePageMeta('Terms of service', 'The terms on which AC7 GROUP provides its services.');

  return (
    <LegalPage
      title="Terms of service"
      updated="2 August 2026"
      intro="The agreement between you and AC7 GROUP when you use any of our services."
    >
      <LegalSection heading="Agreement">
        <p>
          By booking a journey, creating an account or using this website, you agree to these
          terms. If you do not accept them, please do not use the service.
        </p>
      </LegalSection>

      <LegalSection heading="The service">
        <p>
          {env.company.name} provides licensed private hire transport, contracted school
          transport and a booking service for local businesses. Journeys are carried out by
          drivers who are licensed by the relevant local authority.
        </p>
        <p>
          Availability depends on demand, traffic and weather. We aim to arrive within the time
          quoted but cannot guarantee it, and we are not liable for missed onward travel such as
          flights or trains. If timing is critical, book in advance and tell the control centre.
        </p>
      </LegalSection>

      <LegalSection heading="Fares and payment">
        <ul>
          <li>The fare is shown before you confirm and does not change unless you change the route.</li>
          <li>Waiting time, additional stops and tolls may be added where they apply.</li>
          <li>Payment is taken through the app or directly with the driver where agreed.</li>
          <li>Soiling or damage to a vehicle may incur a cleaning charge.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Cancellations">
        <p>
          You can cancel free of charge before a driver is assigned. Once a driver is on the way a
          cancellation fee may apply, reflecting the distance they have already travelled. For
          advance bookings, cancel at least two hours before the pickup time to avoid a charge.
        </p>
      </LegalSection>

      <LegalSection heading="Your responsibilities">
        <ul>
          <li>Give accurate pickup and destination details.</li>
          <li>Be ready at the agreed time and place.</li>
          <li>Treat drivers with respect. Abuse or threats end the journey immediately.</li>
          <li>Do not smoke, or carry anything illegal, in a vehicle.</li>
          <li>Wear a seatbelt, and use an appropriate child seat where one is required.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="School transport">
        <p>
          Contracted school transport is governed by the agreement with the commissioning council
          or school, which takes precedence over these terms where the two differ. Parents and
          guardians must tell us in advance about any medical or accessibility need. A child will
          only be released to a named adult where the contract requires it.
        </p>
      </LegalSection>

      <LegalSection heading="Bookings with third-party businesses">
        <p>
          Where you book a restaurant, garage or similar through us, your agreement for that
          service is with the business itself. We pass on your booking and help resolve problems,
          but we are not responsible for the quality of what they provide.
        </p>
      </LegalSection>

      <LegalSection heading="Liability">
        <p>
          Nothing in these terms limits our liability for death or personal injury caused by
          negligence, for fraud, or for anything else that cannot be limited under English law.
          Subject to that, our liability for any journey is limited to the fare paid for it.
        </p>
      </LegalSection>

      <LegalSection heading="Complaints">
        <p>
          Call the control centre on{' '}
          <a href={`tel:${env.controlCentre.tel}`}>{env.controlCentre.display}</a> or email{' '}
          <a href={`mailto:${env.controlCentre.email}`}>{env.controlCentre.email}</a>. We
          acknowledge complaints within one working day. These terms are governed by the law of
          England and Wales.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
