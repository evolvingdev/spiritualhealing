import type { Locale } from '@/i18n/routing';
import type { LegalDocument } from '../legal-document';
import { TO_BE_CONFIRMED } from '../legal-document';

/**
 * Privacy Notice, version CURRENT_POLICY_VERSIONS.privacy_notice. DRAFT written for India's
 * Digital Personal Data Protection Act 2023 and Rules 2025 (ADR 0016); it must be reviewed by a
 * qualified Indian lawyer before launch. Changing the text requires a new version.
 */
export const PRIVACY_NOTICE: Readonly<Record<Locale, LegalDocument>> = {
  'en-IN': {
    title: 'Privacy Notice',
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          `Spiriteal is provided by ${TO_BE_CONFIRMED} (legal entity name and registered address). For the purposes of the Digital Personal Data Protection Act, 2023, we are the Data Fiduciary for the personal data described here.`,
          'This notice explains what personal data we process for your account and sign-in, why, and the choices and rights you have.',
        ],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'Your email address, used to identify your account and to send you sign-in codes, confirmation links and security notices.',
          'Your password, if you choose one. It is stored only in hashed form by our authentication provider; nobody at Spiriteal can see it.',
          'Your authenticator app setup, if you turn on two-step verification. The secret is held by our authentication provider.',
          'Records of your sign-ins and sessions: when and how you signed in, when a session was last used, and your IP address. We use these to keep your account secure, to end inactive sessions and to limit repeated attempts.',
          'Your confirmation that you are 18 or older and your acceptance of our Terms of Service and this notice, with the version and the date and time.',
          'Your role (member, practitioner or administrator) and a security record of important account events, such as password changes and role changes.',
          'At this stage we do not collect information about your health, wellbeing or spiritual beliefs. If we add features that need such information, we will explain them and ask for your consent separately before collecting it.',
        ],
      },
      {
        heading: 'Why we use it',
        paragraphs: [
          'To create and run your account and let you sign in, based on your consent and on our agreement with you.',
          'To protect your account and our service from misuse, for example by detecting unusual sign-in activity and ending sessions after a period of inactivity.',
          'To meet our legal obligations, and to respond to lawful requests from authorities.',
          'We do not sell your personal data and we do not use it for advertising.',
        ],
      },
      {
        heading: 'Who processes it for us',
        paragraphs: [
          'Supabase (authentication and database), with data stored in Mumbai, India.',
          'Amazon Web Services (hosting and email delivery), in Mumbai, India.',
          'Google, only if you choose “Continue with Google”, in which case Google shares your name and email address with us under its own privacy policy.',
          'These providers act on our instructions, under contracts that require them to protect your data.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Your account data is kept while your account is open. When your account is deleted, we delete your personal data, except records we must keep by law.',
          'Session activity records are removed automatically when the session ends.',
          `Security records are kept for ${TO_BE_CONFIRMED} so that misuse can be investigated, and then deleted or made anonymous.`,
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You may ask us for a summary of the personal data we hold about you and how we use it, ask us to correct or complete it, or ask us to erase it.',
          'You may withdraw your consent at any time, as easily as you gave it. Withdrawing consent means we can no longer provide your account, and it does not affect processing that took place before.',
          'You may nominate another person to exercise these rights on your behalf in the event of your death or incapacity.',
          `To exercise any right or raise a concern, contact our Grievance Officer at ${TO_BE_CONFIRMED} (name and email address). We will respond within ${TO_BE_CONFIRMED}.`,
          'If you are not satisfied with our response, you may complain to the Data Protection Board of India.',
        ],
      },
      {
        heading: 'Age requirement',
        paragraphs: [
          'Spiriteal is only for adults aged 18 or older. We ask you to confirm your age when you create your account.',
        ],
      },
      {
        heading: 'How we protect your data',
        paragraphs: [
          'Your data is encrypted in transit and at rest. Access is limited to what each person needs, practitioners and administrators must use two-step verification, and important account events are recorded.',
          'If a personal data breach affects you, we will inform you and the Data Protection Board of India as the law requires.',
        ],
      },
      {
        heading: 'Changes to this notice',
        paragraphs: [
          'When we change this notice we publish a new version and ask you to review and accept it before you continue using Spiriteal.',
        ],
      },
    ],
  },
  'hi-IN': {
    title: 'गोपनीयता सूचना',
    sections: [
      {
        heading: 'हम कौन हैं',
        paragraphs: [
          `Spiriteal, ${TO_BE_CONFIRMED} (कानूनी इकाई का नाम और पंजीकृत पता) द्वारा प्रदान किया जाता है। डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के प्रयोजनों के लिए, यहाँ वर्णित व्यक्तिगत डेटा के लिए हम डेटा फ़िड्यूशरी हैं।`,
          'यह सूचना बताती है कि आपके खाते और साइन-इन के लिए हम कौन-सा व्यक्तिगत डेटा, क्यों संसाधित करते हैं, और आपके पास क्या विकल्प और अधिकार हैं।',
        ],
      },
      {
        heading: 'हम क्या एकत्र करते हैं',
        paragraphs: [
          'आपका ईमेल पता, जिसका उपयोग आपके खाते की पहचान करने और आपको साइन-इन कोड, पुष्टि लिंक और सुरक्षा सूचनाएँ भेजने के लिए होता है।',
          'आपका पासवर्ड, यदि आप कोई पासवर्ड चुनते हैं। हमारा प्रमाणीकरण प्रदाता इसे केवल हैश किए गए रूप में संग्रहीत करता है; Spiriteal में कोई भी इसे नहीं देख सकता।',
          'आपके ऑथेंटिकेटर ऐप की सेटिंग, यदि आप दो-चरणीय सत्यापन चालू करते हैं। इसकी गुप्त कुंजी हमारे प्रमाणीकरण प्रदाता के पास रहती है।',
          'आपके साइन-इन और सत्रों के रिकॉर्ड: आपने कब और कैसे साइन इन किया, किसी सत्र का अंतिम उपयोग कब हुआ, और आपका IP पता। हम इनका उपयोग आपके खाते को सुरक्षित रखने, निष्क्रिय सत्र समाप्त करने और बार-बार के प्रयासों को सीमित करने के लिए करते हैं।',
          'आपकी यह पुष्टि कि आपकी आयु 18 वर्ष या उससे अधिक है, और हमारी सेवा की शर्तों तथा इस सूचना की आपकी स्वीकृति, संस्करण और तिथि-समय के साथ।',
          'आपकी भूमिका (सदस्य, प्रैक्टिशनर या प्रशासक) और खाते की महत्वपूर्ण घटनाओं, जैसे पासवर्ड या भूमिका में बदलाव, का सुरक्षा रिकॉर्ड।',
          'इस चरण में हम आपके स्वास्थ्य, कल्याण या आध्यात्मिक मान्यताओं के बारे में कोई जानकारी एकत्र नहीं करते। यदि हम ऐसी जानकारी की ज़रूरत वाली सुविधाएँ जोड़ते हैं, तो हम उन्हें समझाएँगे और जानकारी एकत्र करने से पहले अलग से आपकी सहमति माँगेंगे।',
        ],
      },
      {
        heading: 'हम इसका उपयोग क्यों करते हैं',
        paragraphs: [
          'आपका खाता बनाने और चलाने तथा आपको साइन इन करने देने के लिए, आपकी सहमति और आपके साथ हमारे अनुबंध के आधार पर।',
          'आपके खाते और हमारी सेवा को दुरुपयोग से बचाने के लिए, जैसे असामान्य साइन-इन गतिविधि का पता लगाना और निष्क्रियता की अवधि के बाद सत्र समाप्त करना।',
          'अपने कानूनी दायित्वों को पूरा करने और अधिकारियों के वैध अनुरोधों का उत्तर देने के लिए।',
          'हम आपका व्यक्तिगत डेटा नहीं बेचते और इसका उपयोग विज्ञापन के लिए नहीं करते।',
        ],
      },
      {
        heading: 'हमारे लिए इसे कौन संसाधित करता है',
        paragraphs: [
          'Supabase (प्रमाणीकरण और डेटाबेस), जिसका डेटा मुंबई, भारत में संग्रहीत होता है।',
          'Amazon Web Services (होस्टिंग और ईमेल भेजना), मुंबई, भारत में।',
          'Google, केवल तभी जब आप “Google के साथ आगे बढ़ें” चुनते हैं; उस स्थिति में Google अपनी गोपनीयता नीति के अंतर्गत आपका नाम और ईमेल पता हमारे साथ साझा करता है।',
          'ये प्रदाता हमारे निर्देशों पर, ऐसे अनुबंधों के अंतर्गत काम करते हैं जो उन्हें आपके डेटा की सुरक्षा करने के लिए बाध्य करते हैं।',
        ],
      },
      {
        heading: 'हम इसे कितने समय तक रखते हैं',
        paragraphs: [
          'जब तक आपका खाता खुला है, आपका खाता डेटा रखा जाता है। आपका खाता हटाए जाने पर हम आपका व्यक्तिगत डेटा हटा देते हैं, सिवाय उन रिकॉर्ड के जिन्हें कानूनन रखना आवश्यक है।',
          'सत्र समाप्त होने पर सत्र गतिविधि के रिकॉर्ड अपने-आप हटा दिए जाते हैं।',
          `दुरुपयोग की जाँच की जा सके, इसलिए सुरक्षा रिकॉर्ड ${TO_BE_CONFIRMED} तक रखे जाते हैं, और फिर हटा दिए जाते हैं या अनाम कर दिए जाते हैं।`,
        ],
      },
      {
        heading: 'आपके अधिकार',
        paragraphs: [
          'आप हमसे अपने बारे में हमारे पास मौजूद व्यक्तिगत डेटा और उसके उपयोग का सारांश माँग सकते हैं, उसे सुधारने या पूरा करने के लिए कह सकते हैं, या उसे मिटाने के लिए कह सकते हैं।',
          'आप किसी भी समय अपनी सहमति उतनी ही आसानी से वापस ले सकते हैं जितनी आसानी से आपने दी थी। सहमति वापस लेने का अर्थ है कि हम आपका खाता आगे प्रदान नहीं कर सकेंगे; इससे पहले हुई प्रोसेसिंग पर कोई असर नहीं पड़ता।',
          'आपकी मृत्यु या अक्षमता की स्थिति में आपकी ओर से इन अधिकारों का उपयोग करने के लिए आप किसी अन्य व्यक्ति को नामित कर सकते हैं।',
          `किसी भी अधिकार का उपयोग करने या कोई चिंता उठाने के लिए हमारे शिकायत अधिकारी से ${TO_BE_CONFIRMED} (नाम और ईमेल पता) पर संपर्क करें। हम ${TO_BE_CONFIRMED} के भीतर उत्तर देंगे।`,
          'यदि आप हमारे उत्तर से संतुष्ट नहीं हैं, तो आप भारत के डेटा संरक्षण बोर्ड में शिकायत कर सकते हैं।',
        ],
      },
      {
        heading: 'आयु संबंधी शर्त',
        paragraphs: [
          'Spiriteal केवल 18 वर्ष या उससे अधिक आयु के वयस्कों के लिए है। खाता बनाते समय हम आपसे अपनी आयु की पुष्टि करने के लिए कहते हैं।',
        ],
      },
      {
        heading: 'हम आपके डेटा की सुरक्षा कैसे करते हैं',
        paragraphs: [
          'आपका डेटा भेजते समय और संग्रहीत रहते समय एन्क्रिप्ट किया जाता है। हर व्यक्ति की पहुँच उतनी ही रखी जाती है जितनी उसे ज़रूरत है, प्रैक्टिशनर और प्रशासकों के लिए दो-चरणीय सत्यापन अनिवार्य है, और खाते की महत्वपूर्ण घटनाएँ दर्ज की जाती हैं।',
          'यदि किसी व्यक्तिगत डेटा उल्लंघन का आप पर असर पड़ता है, तो कानून के अनुसार हम आपको और भारत के डेटा संरक्षण बोर्ड को सूचित करेंगे।',
        ],
      },
      {
        heading: 'इस सूचना में बदलाव',
        paragraphs: [
          'जब हम इस सूचना में बदलाव करते हैं, तो हम नया संस्करण प्रकाशित करते हैं और Spiriteal का उपयोग जारी रखने से पहले आपसे उसे देखकर स्वीकार करने के लिए कहते हैं।',
        ],
      },
    ],
  },
};
