// TEST ONLY — à supprimer après vérification
const { Resend } = require("resend");

module.exports = async function handler(req, res) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "MYLIDE <onboarding@resend.dev>",
    to: "hadrienguenard04@gmail.com",
    subject: "Test MYLIDE",
    html: "<p>Si tu reçois ce mail, Resend fonctionne ✅</p>",
  });
  console.log("test-email result:", JSON.stringify({ data, error }));
  res.json({ data, error });
};
