/* Sellycat legal texts, English. Markdown for the help renderer: no backticks, no "${". The German version prevails. */

export const imprint = `
# Legal notice

## Operator of Sellycat

**my105 GmbH**\\
Vulkanplatz 7\\
8048 Zurich\\
Switzerland

Email: [hello@sellycat.com](mailto:hello@sellycat.com)\\
Support: [support@sellycat.com](mailto:support@sellycat.com)\\
Web: [sellycat.com](https://sellycat.com)

Authorised representatives: the management of my105 GmbH.

## Shops on Sellycat

Sellycat is software that businesses use to run their own deal shops. The seller of the vouchers and the party responsible for a shop's content (offers, texts, images, prices) is the respective shop operator, not my105 GmbH. You will find the operator's legal notice, terms and privacy policy in the footer of every shop.

## Disclaimer

The content of this website has been compiled with care. We accept no liability for its accuracy, completeness or timeliness. Linked third-party websites are outside our control; their operators are solely responsible for their content.

## Copyright and trademarks

The Sellycat name, logo, design and software are protected. Content uploaded by shop operators remains theirs.
`;

export const terms = `
# Terms of Service

These Terms govern the use of the Sellycat platform operated by **my105 GmbH**, Vulkanplatz 7, 8048 Zurich, Switzerland ("Sellycat", "we"). They apply to businesses, organisations and self-employed persons who run a shop with Sellycat ("Customer"). By signing up or booking a plan, the Customer accepts these Terms and the Data Processing Agreement (DPA), which forms part of these Terms. In case of discrepancies, the German version prevails.

## 1. Service

- Sellycat is software as a service: the Customer creates a branded online shop under a Sellycat address (e.g. name.sellycat.com) or, depending on the plan, under its own domain. It offers deals in the shop (vouchers with a price, quantity and sales period), sells them to buyers ("Buyers") and redeems the vouchers itself or through partners.
- Features include, among others: shop design, deal editor (including AI import), payment processing via Stripe, vouchers as PDF and for Apple Wallet and Google Wallet, email delivery, redemption app, partners and locations, partner settlements, analytics, team and roles, API and webhooks. The features and limits that apply depend on the chosen plan as shown on the pricing page and in the dashboard under Subscription.
- We continuously develop Sellycat. Features may change as long as the essential purpose of the booked plan is preserved.

## 2. Registration and account

- Sellycat is intended exclusively for businesses and organisations, not for consumers. Whoever signs up confirms that they are authorised to act for the Customer.
- Information provided at sign-up must be true and complete. Login details must be kept confidential; actions taken under an account are attributed to the Customer.
- Owners and admins can invite further people and assign roles (e.g. editor, redeemer, partner). The Customer is responsible for its team and its actions.

## 3. Sales to Buyers

- **The Buyer's contracting party is the Customer.** The purchase contract for a voucher is concluded exclusively between the Customer and the Buyer. Sellycat is not the seller, not a commission agent and not a party to this contract.
- The Customer is responsible for its offers and their compliance with applicable law, in particular: correct prices and reference prices, VAT, voucher validity and redemption conditions, rights of withdrawal and return, distance-selling information duties, advertising and unfair-competition law, and the fulfilment of the vouchers (by itself or by its partners).
- Before a deal can be published, the Customer must provide a legal notice, its own terms and a privacy policy in the dashboard. The Customer alone is responsible for their content. Its privacy policy must cover the processing by Sellycat and the sub-processors listed in the DPA.
- The Customer handles refunds, complaints and requests from Buyers. Sellycat provides tools for this (e.g. refunds, voiding vouchers, resending emails).
- If the Customer works with partners (e.g. restaurants, stores), it governs that relationship itself. Partner settlements in Sellycat are a tool; the Customer checks their correctness and makes payments to partners itself.

## 4. Payments via Stripe

- Buyers pay through the Customer's own Stripe account (Stripe Connect). The Customer concludes its own contract with Stripe and accepts Stripe's terms. Buyers' money flows directly to the Customer's Stripe account; Sellycat never holds Buyers' funds.
- For each payment, Stripe automatically deducts Sellycat's **fee per sale** (percentage according to the plan) and transfers it to Sellycat. Stripe's own fees, which the Customer settles directly with Stripe, come on top.
- In case of a refund, the fee per sale is refunded proportionally. Stripe's fees are governed by Stripe's terms.
- Chargebacks, fraud and disputes with Buyers are borne by the Customer in its relationship with Stripe and the Buyers.
- A monthly overview of Sellycat's fees is available in the dashboard under Subscription as PDF and CSV.

## 5. Plans, prices and payment of the subscription

- There is a free plan (Free) and paid plans. Prices, fees per sale and features are shown on the pricing page. The prices at the time of booking apply; they include VAT unless stated otherwise.
- Paid plans are paid monthly or yearly in advance via Stripe. The Customer manages receipts, invoices and the payment method in the customer portal ("Invoices & payment methods").
- A free trial may apply to individual plans. Its conditions are shown before booking.
- An upgrade takes effect immediately; the difference is charged pro rata. A downgrade takes effect at the end of the paid period.
- Plans marked "On request" are agreed individually; the offer applies, supplemented by these Terms.
- If a payment fails, we remind the Customer. If it is not made, the shop moves to the Free plan; the features and limits of the Free plan then apply (e.g. number of live deals, Sellycat branding).
- Fees already paid are not refunded, including on cancellation or a downgrade during the current period.
- We announce price changes at least 30 days in advance by email. They apply to existing subscriptions from the next billing period after that notice period. If the Customer does not agree, it may cancel before then.

## 6. Customer content

- The Customer retains all rights to its content (texts, images, logos, fonts, data). It grants Sellycat a non-exclusive right, limited to the term of the contract, to store, process (e.g. image sizes, PDF, wallet passes) and deliver the content as required for operating the service.
- The Customer warrants that it holds all necessary rights (copyright, trademark, personality and name rights) and that its content and offers do not infringe any law.
- Prohibited are in particular: unlawful, misleading or fraudulent offers; offers of goods or services whose distribution is prohibited or requires a licence that is not held; gambling without a licence; pornographic, violence-glorifying, discriminatory or hateful content; malware, spam and phishing; content infringing third-party rights.
- We may block or remove prohibited content and deals without notice and, in case of serious or repeated violations, suspend the account or terminate the contract without notice. We report unlawful content to the authorities where we are obliged to do so.

## 7. Imports, AI and third-party services

- The deal import and the branding import read publicly accessible web pages specified by the Customer and may process texts and images with AI (Anthropic Claude). The Customer reviews the results before publishing and is responsible for them. It may only import content to which it holds the rights.
- Opening hours and addresses can be completed via Google Places and Mapbox. Apple's and Google's terms additionally apply to Apple Wallet and Google Wallet.
- Sellycat gives no warranty for the availability of third-party services (e.g. Stripe, Apple, Google) or for changes to them.

## 8. API and webhooks

- API keys are confidential and may only be used for the Customer's own shop. The Customer is responsible for all access with its keys and revokes a key immediately if it may have fallen into the wrong hands.
- We may limit requests (rate limits) and block keys in case of misuse.
- Webhooks are sent to the public addresses specified by the Customer. The Customer is responsible for the security of the receiving system and for verifying the signature.

## 9. Own domains and email senders

Depending on the plan, the Customer can connect its own domain and its own sender domain. It must be entitled to use the domain and set the DNS records itself. If the domain is no longer configured correctly, the shop continues under the Sellycat address and emails are sent via Sellycat's sender.

## 10. Availability and support

- We strive for high availability but do not guarantee any particular availability unless expressly agreed for a plan on request. Where possible, we carry out maintenance at low-traffic times.
- The Customer receives support via the help center and the support form in the dashboard, usually on business days.

## 11. Data protection

- Sellycat is responsible for the data of Customers and their team members; details in the [privacy policy](/legal/privacy).
- The Customer is responsible for the data of Buyers and partners arising in a shop. Sellycat processes it on the Customer's behalf under the [Data Processing Agreement](/legal/dpa).
- If the Customer integrates its own analytics or marketing services (e.g. Google Analytics, Meta Pixel), it is responsible for them. Sellycat only loads them after visitors consent and provides a cookie banner for this.

## 12. Liability

- Sellycat is liable without limitation for damage caused intentionally or through gross negligence and for personal injury.
- For slight negligence, Sellycat is liable only for direct damage and, per calendar year, at most up to the amount of fees the Customer paid to Sellycat in the twelve months before the event giving rise to the damage (subscription and fees per sale). Liability for indirect and consequential damage, lost profit and loss of data is excluded to the extent permitted by law. The Customer is responsible for its own backups of its data (e.g. CSV exports).
- Sellycat is not liable for Customers' content and offers, for the fulfilment of vouchers, for partners' services or for third-party services (in particular Stripe, Apple, Google).
- The Customer indemnifies Sellycat against third-party claims based on its content, offers, its relationship with Buyers and partners or a breach of these Terms, including reasonable legal defence costs.

## 13. Term and termination

- An account on the Free plan runs indefinitely and can be cancelled at any time.
- Paid subscriptions renew automatically for the chosen period (month or year) unless cancelled before its end. Cancellation is made in the customer portal or by email to support@sellycat.com; the subscription then ends with the paid period and the shop continues on the Free plan.
- We may terminate the contract with 30 days' notice to the end of a month, for paid subscriptions to the end of the paid period. Either party may terminate without notice for good cause (e.g. serious violations of section 6, fraud, payment default despite reminder).
- After the contract ends, the Customer can export its data for 30 days (CSV in the dashboard, further data on request). We then delete the shop and data within 90 days unless a statutory retention obligation applies. Vouchers already received by Buyers remain valid as PDF; links and wallet passes stop working after deletion. The Customer informs its Buyers in good time and fulfils outstanding vouchers.

## 14. Changes to these Terms

We may change these Terms. We announce material changes by email at least 30 days before they take effect. If the Customer does not object before they take effect, the new Terms are deemed accepted; in case of an objection, either party may terminate as of the effective date. We point out this consequence in the notice.

## 15. Final provisions

- Deviating terms of the Customer only apply if we agree to them in writing.
- If a provision is invalid, the remainder stays in force; it is replaced by a provision that comes closest to the economic purpose.
- **Swiss law** applies, excluding the UN Convention on Contracts for the International Sale of Goods (CISG) and conflict-of-law rules.
- **Place of jurisdiction is Zurich**, Switzerland. Sellycat may also sue the Customer at its registered office.
- In case of discrepancies between the German and another language version, the German version prevails.
`;

export const privacy = `
# Privacy policy

This privacy policy explains how **my105 GmbH**, Vulkanplatz 7, 8048 Zurich, Switzerland ("Sellycat", "we"), processes personal data: on sellycat.com, in the dashboard, in the help center and when operating the shops. It follows the Swiss Federal Act on Data Protection (FADP) and, where applicable, the EU General Data Protection Regulation (GDPR).

## 1. Controller and contact

The controller is my105 GmbH, Vulkanplatz 7, 8048 Zurich, Switzerland. Questions about data protection and requests regarding your rights: [support@sellycat.com](mailto:support@sellycat.com).

We have not appointed a representative in the EU, as our services are aimed at businesses and we process Buyers' data on behalf of the shop operators (see section 2).

## 2. Two roles: Sellycat and the shops

- **Sellycat is the controller** for the data of visitors to sellycat.com, of customers (shop operators) and their team members, and for requests to us (support, contact form).
- **The shop operator is the controller** for the data of its Buyers, partners and shop visitors. Sellycat processes this data only on its behalf (processor under Art. 9 FADP and Art. 28 GDPR). If you buy in a shop, you will find the operator's privacy policy in the shop's footer; please contact the operator first. We support the operator in this.

## 3. What data we process

**Visits to sellycat.com and the shops**
- Technical data when accessing pages: IP address, date and time, requested address, browser and operating system, referrer. They are used for delivery, security (e.g. protection against misuse, request limits) and troubleshooting and are stored briefly in our hosting providers' logs.
- View counts: we count views of shops and deals as plain daily counters, without cookies, without storing anything on your device and without reference to any person.

**Customers and team members**
- Account: name, email address, password (hash only), role, language, time of acceptance of the Terms, sign-in data and times, for staff additionally a second factor (TOTP).
- Shop and contract data: company name, address, contact details, settings, plan, subscription status, invoices and fees. Payment method details are stored only by Stripe.
- Content: deals, texts, images, partners (including bank details for settlements), locations, the shop's legal texts.
- Usage: logs of important actions (e.g. redemptions, refunds, changes made by staff) for traceability and security.

**Requests to us**
- Support requests (content, attachments, replies), contact requests via the pricing page (name, email, company, message, country derived from the IP address), feedback in the help center ("Was this helpful?", optionally a comment).

**Buyers and partners (on behalf of the shop operators)**
- Order: email address, name if provided, purchased deals, amounts, times, status, refunds. For gifts, the recipient details entered by the Buyer.
- Vouchers: code, validity, redemptions (time, location, person or API key that redeemed).
- Wallet: when a voucher is saved to Apple Wallet, we receive a device ID and a push token from the device so the pass can be updated.
- Payment data (card, TWINT etc.) is entered by the Buyer directly with Stripe; neither the shop nor Sellycat sees it.

## 4. Purposes and legal bases

- Providing Sellycat and performing the contract with customers (Art. 6(1)(b) GDPR): account, shop, billing, support.
- Security, prevention of misuse, error analysis and improvement of our services (legitimate interest, Art. 6(1)(f) GDPR).
- Legal obligations, in particular retention of accounting records (Art. 6(1)(c) GDPR).
- Communications about the account and the contract (e.g. confirmations, payment notices, changes to the Terms). We only send marketing with consent or, where permitted, to customers about similar services of our own, with the option to unsubscribe at any time.
- We process Buyers' data exclusively according to the shop operator's instructions.

## 5. Cookies and local storage

**sellycat.com and the dashboard** only use necessary cookies, which is why there is no cookie banner there:
- Sign-in cookies (Supabase Auth) for the dashboard session, valid for sellycat.com and the shop addresses under sellycat.com.
- sc_lang: the chosen language (1 year).
- On the test environment, additionally a cookie for the password protection.

**In the shops**, Sellycat likewise only sets necessary cookies (sign-in for "My vouchers" and the redemption app). At checkout, Stripe loads its payment form; Stripe sets cookies for fraud prevention that are necessary for the payment. If the shop operator has set up Google Analytics or Meta Pixel, the shop shows a banner; these services only load after your consent, and you can change your choice at any time under "Cookie settings" in the shop footer. Your choice is stored in your browser's local storage. The shop operator is responsible for these services.

## 6. Recipients and service providers

We only disclose data where necessary for the purposes and use carefully selected service providers who are contractually bound to data protection:

- **Vercel Inc.** (USA): hosting and delivery of the website, server functions in Frankfurt (EU), global content delivery network.
- **Supabase Inc.** (USA): database, authentication and file storage; data center in Frankfurt (EU).
- **Stripe** (Stripe Payments Europe Ltd., Ireland, and Stripe Inc., USA): Buyers' payments via the shop operator's Stripe account, Sellycat's subscriptions and invoices. Stripe is partly a controller itself for payment data.
- **Mailgun** (Sinch, EU region): sending emails (confirmations, vouchers, support).
- **Anthropic PBC** (USA): AI features, only when used: deal and branding import (content of web pages specified by the customer) and reading voucher codes from photos in the redemption app.
- **Google** (Google Ireland Ltd. / Google LLC): Google Places for addresses and opening hours (server-side only, business details only); Google Wallet when a voucher is saved to Google Wallet. We serve Google Fonts through our own server; your browser does not contact Google for this.
- **Apple** (Apple Inc.): Apple Wallet and push notifications for saved passes.
- **Mapbox Inc.** (USA): converting addresses into coordinates and map images on deal pages.

We only disclose data to authorities where legally obliged to do so.

## 7. Transfers abroad

Some service providers are based in the USA or may access data from there. We transfer data on the basis of the Swiss-U.S. and EU-U.S. Data Privacy Framework where the recipient is certified, otherwise on the basis of the European Commission's standard contractual clauses (with the adjustments required for Switzerland) and supplementary measures. Database and file storage data is located in Frankfurt (EU).

## 8. Retention

- We store account data for the duration of the contract. After it ends, we delete the shop and data within 90 days unless a retention obligation applies.
- Accounting-relevant data (invoices, fees) is kept for 10 years.
- We delete support requests at the latest 3 years after closure, contact requests at the latest 2 years after the last contact.
- Technical logs are deleted after a short time (usually up to 30 days), webhook events after 30 days.
- We delete Buyers' data as instructed by the shop operator, at the latest when the shop is deleted.

## 9. Security

We protect data with appropriate technical and organisational measures, including: encrypted transmission (HTTPS), encryption of the database at rest, strict separation of shops in the database (row level security), roles and permissions, two-factor sign-in for staff, passwords and API keys stored only as hashes, logging of sensitive actions, regular backups.

## 10. Your rights

You can request access to your data as well as rectification, erasure, restriction of processing, disclosure or portability of your data. You can object to processing based on legitimate interests and withdraw consent at any time. Write to us at support@sellycat.com. If your request concerns a purchase in a shop, please contact the shop operator; we forward requests to them.

You have the right to lodge a complaint with a supervisory authority, in Switzerland with the Federal Data Protection and Information Commissioner (FDPIC), in the EU with the authority of your country of residence.

## 11. Changes

We update this privacy policy when our processing or the law changes. The version published on this page applies.
`;

export const dpa = `
# Data Processing Agreement (DPA)

This agreement forms part of the Terms between the Customer (shop operator, "Controller") and **my105 GmbH**, Vulkanplatz 7, 8048 Zurich, Switzerland ("Sellycat", "Processor"). It governs the processing of personal data that Sellycat processes on behalf of the Customer under Art. 9 of the Swiss Federal Act on Data Protection (FADP) and, where applicable, Art. 28 GDPR. It applies upon acceptance of the Terms at sign-up. In case of discrepancies, the German version prevails.

## 1. Subject matter, duration and nature of processing

- **Subject matter:** operating the Customer's shop on Sellycat: presenting offers, orders and payment processing (via the Customer's Stripe account), issuing and sending vouchers (email, PDF, Apple and Google Wallet), redemption, partner settlements, analytics, API and webhooks, support.
- **Duration:** for the term of the contract and until deletion under section 9.
- **Nature:** collecting, storing, organising, displaying, transmitting (to the recipients chosen by the Customer and the sub-processors), deleting.

## 2. Data subjects and data categories

- **Buyers and gift recipients:** email address, name if provided, orders, amounts, times, vouchers and their redemptions, messages to gift recipients, device ID and push token for Apple Wallet, technical data (IP address) on access.
- **Partners and their staff:** names, contact details, locations, bank details for settlements, redeemer accounts.
- **Shop visitors:** technical data on access; views are stored only as anonymous daily counters.
- Sellycat is not intended to process special categories of personal data; the Customer refrains from entering such data in Sellycat.

## 3. Customer obligations

- The Customer is responsible for the lawfulness of the processing, in particular for its own privacy policy in the shop naming Sellycat and the sub-processors, for any consents (e.g. newsletter, analytics and marketing services) and for responding to data subject requests.
- The Customer gives instructions primarily through the settings and functions in the dashboard. It gives further instructions in writing or by email to support@sellycat.com.

## 4. Sellycat's obligations

- Sellycat processes the data only on documented instructions from the Customer and only to provide the services, unless a legal obligation requires otherwise; in that case Sellycat informs the Customer beforehand where permitted.
- If Sellycat considers an instruction unlawful, it informs the Customer without delay.
- Persons at Sellycat with access to the data are bound to confidentiality and only receive the access they need for their task (e.g. support at the Customer's request).
- Sellycat does not use the data for its own purposes, except in anonymised or aggregated form to improve and secure the service (e.g. totals, error analysis).

## 5. Technical and organisational measures

Sellycat takes appropriate state-of-the-art measures, in particular:

- **Confidentiality:** encryption in transit (TLS) and at rest; strict separation of shops in the database (row level security, automated tests against access across shop boundaries); team roles and permissions; two-factor sign-in for staff; passwords, API keys and one-time codes stored only as hashes; secret values (e.g. webhook secrets, bank details) blocked for browser clients.
- **Integrity:** state changes (payment, issuing, redemption, refund) only through verified database functions with row locks; logging of sensitive actions; signed webhooks; protection against requests to internal networks (SSRF).
- **Availability and resilience:** hosting in data centers with redundancy, daily database backups, request limits (rate limits).
- **Review:** code reviews and security reviews of changes, automated tests, review of sub-processors.

Sellycat may further develop the measures as long as the level of protection does not decrease.

## 6. Sub-processors

The Customer approves the following sub-processors:

- **Vercel Inc.**, USA: hosting, server functions (Frankfurt), content delivery network.
- **Supabase Inc.**, USA: database, authentication, file storage (data center Frankfurt).
- **Mailgun / Sinch**, EU region: email delivery.
- **Stripe** (Stripe Payments Europe Ltd., Ireland, and Stripe Inc., USA): payment processing. Stripe is itself responsible for payment data vis-à-vis the Customer based on its own contract with the Customer.
- **Anthropic PBC**, USA: reading voucher codes from photos in the redemption app (only when used) and AI imports.
- **Apple Inc.** and **Google**: Apple Wallet and Google Wallet, only when a person saves a voucher to their wallet; Google Places for business addresses.
- **Mapbox Inc.**, USA: geocoding of locations and map images.

Sellycat informs the Customer at least 30 days before engaging or replacing a sub-processor by email or by updating this page with a notice in the dashboard. The Customer may object within this period for good cause relating to data protection; if no solution is found, it may terminate the contract as of the date the change takes effect. Sellycat contractually binds sub-processors to an equivalent level of protection.

## 7. Transfers abroad

Transfers to countries without an adequate level of data protection (in particular the USA) are based on the Swiss-U.S. and EU-U.S. Data Privacy Framework where the recipient is certified, otherwise on the European Commission's standard contractual clauses with the adjustments required for Switzerland.

## 8. Assistance, notifications and audits

- Sellycat supports the Customer with the dashboard's functions (e.g. search and export) and on request in responding to data subject requests, data protection impact assessments and notifications to authorities.
- Sellycat notifies the Customer without undue delay, where possible within 48 hours of becoming aware, of a data security breach affecting its data, with the available information on its nature, scope, consequences and measures.
- The Customer may verify compliance with this agreement, primarily through information and documents from Sellycat and its sub-processors (e.g. certificates, audit reports). On-site audits are possible with reasonable advance notice, during business hours and at most once a year, unless there is a specific reason; the Customer bears the costs.

## 9. Return and deletion

After the contract ends, the Customer can export its data for 30 days. Sellycat then deletes the shop's data within 90 days, including copies at sub-processors within their deletion cycles (backups), unless a statutory retention obligation applies.

## 10. Liability and final provisions

- The liability provisions of the Terms apply.
- In case of conflict, this agreement takes precedence over the Terms in matters of data protection.
- Swiss law and the place of jurisdiction Zurich apply. Where the GDPR mandatorily requires otherwise, it prevails.
`;
