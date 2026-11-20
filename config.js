/* ============================================================
   EDIT ONLY THIS FILE to connect your Google Form & Contact Info.

   1. FORM_ACTION
      Open your Google Form > click the 3 dots > "Get pre-filled link".
      Fill dummy values, click "Get link", and copy it. It looks like:
      https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?usp=pp_url&entry.111=a&entry.222=b ...
      Replace "viewform" with "formResponse" and remove everything after it:
      https://docs.google.com/forms/d/e/1FAIpQLSc.../formResponse

   2. ENTRY IDS
      In the same pre-filled link, each field has its own entry.NUMBER.
      Match them to the fields below (the order follows the values you typed).

   3. WHATSAPP_LINK
      WhatsApp > Group > Group info > Invite via link > Copy link.

   4. SEATS
      SEATS_TOTAL  = total seats you are offering.
      SEATS_FILLED = fallback count if live count is not set up.
      SHEET_CSV_URL (optional, recommended) = live count.
        Form > Responses > "Link to Sheets" > in the sheet:
        File > Share > Publish to web > choose the responses sheet,
        format "CSV" > Publish > paste the link here.
        The site then counts the rows automatically.

   5. CONTACT PAGE
      CONTACT_LOCATION = your city or office location.
      CONTACT_PHONE    = your official contact number.
   ============================================================ */
window.SOLETE_CONFIG = {
  FORM_ACTION: "https://docs.google.com/forms/d/e/1FAIpQLScyIj357NZfWFaIxs4DUFUeiO46R9ONYF_wQsid2IhFeUB-gA/formResponse",

ENTRY: {
  name:     "entry.875641703",
  phone:    "entry.872525782",
  college:  "entry.1875190749",
  location: "entry.1008715269"
},

  WHATSAPP_LINK: "https://whatsapp.com/channel/0029VbC4TkABKfi53Wgppx2H",

  SEATS_TOTAL: 100,
  SEATS_FILLED: 46,
  SHEET_CSV_URL: "",

  CONTACT_LOCATION: "[Lohia Towers, Nirmala Convent Rd, opp. Nirmala Convent high school, Gurunanak Nagar, Patamata, Benz Circle, Vijayawada, Andhra Pradesh 520010]",
  CONTACT_PHONE: "[+91  63093 85400]"
};
