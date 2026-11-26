import type { Locale } from '@/i18n/routing';
import type { LegalDocument } from '../legal-document';
import { TO_BE_CONFIRMED } from '../legal-document';

/**
 * Terms of Service, version CURRENT_POLICY_VERSIONS.terms_of_service. DRAFT: must be reviewed by
 * a qualified Indian lawyer before launch (ADR 0016), including the limitation of liability and
 * jurisdiction clauses and the crisis helpline numbers. Changing the text requires a new version.
 */
export const TERMS_OF_SERVICE: Readonly<Record<Locale, LegalDocument>> = {
  'en-IN': {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'About these terms',
        paragraphs: [
          `These terms are an agreement between you and ${TO_BE_CONFIRMED} (legal entity name), the provider of Spiriteal. By creating an account you agree to them. Please also read our Privacy Notice.`,
        ],
      },
      {
        heading: 'Who can use Spiriteal',
        paragraphs: [
          'You must be 18 years of age or older and able to enter into a binding agreement under Indian law.',
          'You must give accurate information when you create your account and keep your email address up to date.',
        ],
      },
      {
        heading: 'What Spiriteal is, and is not',
        paragraphs: [
          'Spiriteal is a service for spiritual wellbeing. It does not provide medical, psychological or other professional advice, diagnosis or treatment, and it does not replace a doctor, therapist or other qualified professional.',
          'Practitioners on Spiriteal offer spiritual and wellbeing guidance. They are not presented as medical providers, and nothing on Spiriteal promises to cure any disease or condition.',
          `If you are in crisis or thinking about harming yourself, please contact emergency services on 112 or the Tele-MANAS helpline on 14416 straight away. ${TO_BE_CONFIRMED}: verify these numbers before publication.`,
        ],
      },
      {
        heading: 'Your account and its security',
        paragraphs: [
          'Keep your password and authenticator app private, and do not share your account. Tell us promptly if you think someone else has used it.',
          'Practitioners and administrators must use two-step verification. For your protection we sign you out after periods of inactivity and ask you to sign in again before sensitive changes.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'Do not misuse Spiriteal: for example, do not try to access accounts or data that are not yours, interfere with the service, upload malicious code, harass others, or use the service for anything unlawful.',
          'We may suspend or close an account that breaks these terms, and we will tell you why unless the law prevents us.',
        ],
      },
      {
        heading: 'Availability and changes',
        paragraphs: [
          'We work to keep Spiriteal available and secure, but we cannot promise it will always be uninterrupted or error-free.',
          'We may change or stop features. When we change these terms we will publish a new version and ask you to accept it before you continue.',
        ],
      },
      {
        heading: 'Ending your account',
        paragraphs: [
          'You may stop using Spiriteal and ask us to delete your account at any time. Our Privacy Notice explains what happens to your data.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          `${TO_BE_CONFIRMED}: limitation of liability, to be drafted by a qualified Indian lawyer. Nothing in these terms limits any right you have under Indian consumer protection law that cannot be limited.`,
        ],
      },
      {
        heading: 'Law and disputes',
        paragraphs: [
          `These terms are governed by the laws of India. Disputes are subject to the courts of ${TO_BE_CONFIRMED} (city). Before going to court, please contact us so that we can try to resolve the matter.`,
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about these terms: ${TO_BE_CONFIRMED} (support email address).`],
      },
    ],
  },
  'hi-IN': {
    title: 'सेवा की शर्तें',
    sections: [
      {
        heading: 'इन शर्तों के बारे में',
        paragraphs: [
          `ये शर्तें आपके और Spiriteal के प्रदाता ${TO_BE_CONFIRMED} (कानूनी इकाई का नाम) के बीच एक समझौता हैं। खाता बनाकर आप इनसे सहमत होते हैं। कृपया हमारी गोपनीयता सूचना भी पढ़ें।`,
        ],
      },
      {
        heading: 'Spiriteal का उपयोग कौन कर सकता है',
        paragraphs: [
          'आपकी आयु 18 वर्ष या उससे अधिक होनी चाहिए और आप भारतीय कानून के अंतर्गत बाध्यकारी समझौता करने में सक्षम होने चाहिए।',
          'खाता बनाते समय आपको सही जानकारी देनी होगी और अपना ईमेल पता अद्यतन रखना होगा।',
        ],
      },
      {
        heading: 'Spiriteal क्या है, और क्या नहीं',
        paragraphs: [
          'Spiriteal आध्यात्मिक कल्याण के लिए एक सेवा है। यह चिकित्सीय, मनोवैज्ञानिक या कोई अन्य पेशेवर सलाह, निदान या उपचार प्रदान नहीं करती, और डॉक्टर, थेरेपिस्ट या अन्य योग्य पेशेवर का विकल्प नहीं है।',
          'Spiriteal पर प्रैक्टिशनर आध्यात्मिक और कल्याण संबंधी मार्गदर्शन देते हैं। उन्हें चिकित्सा प्रदाता के रूप में प्रस्तुत नहीं किया जाता, और Spiriteal पर कुछ भी किसी रोग या स्थिति को ठीक करने का वादा नहीं करता।',
          `यदि आप संकट में हैं या स्वयं को नुकसान पहुँचाने के बारे में सोच रहे हैं, तो कृपया तुरंत आपातकालीन सेवा 112 या टेली-मानस हेल्पलाइन 14416 पर संपर्क करें। ${TO_BE_CONFIRMED}: प्रकाशन से पहले इन नंबरों की पुष्टि करें।`,
        ],
      },
      {
        heading: 'आपका खाता और उसकी सुरक्षा',
        paragraphs: [
          'अपना पासवर्ड और ऑथेंटिकेटर ऐप गोपनीय रखें, और अपना खाता किसी के साथ साझा न करें। यदि आपको लगे कि किसी और ने इसका उपयोग किया है, तो हमें तुरंत बताएँ।',
          'प्रैक्टिशनर और प्रशासकों के लिए दो-चरणीय सत्यापन अनिवार्य है। आपकी सुरक्षा के लिए, निष्क्रियता की अवधि के बाद हम आपको साइन आउट कर देते हैं और संवेदनशील बदलावों से पहले फिर से साइन इन करने के लिए कहते हैं।',
        ],
      },
      {
        heading: 'स्वीकार्य उपयोग',
        paragraphs: [
          'Spiriteal का दुरुपयोग न करें: उदाहरण के लिए, ऐसे खातों या डेटा तक पहुँचने का प्रयास न करें जो आपके नहीं हैं, सेवा में बाधा न डालें, हानिकारक कोड अपलोड न करें, दूसरों को परेशान न करें, और सेवा का उपयोग किसी भी गैरकानूनी कार्य के लिए न करें।',
          'इन शर्तों का उल्लंघन करने वाले खाते को हम निलंबित या बंद कर सकते हैं, और जब तक कानून हमें रोके नहीं, हम आपको इसका कारण बताएँगे।',
        ],
      },
      {
        heading: 'उपलब्धता और बदलाव',
        paragraphs: [
          'हम Spiriteal को उपलब्ध और सुरक्षित रखने का प्रयास करते हैं, लेकिन यह वादा नहीं कर सकते कि यह हमेशा बिना रुकावट या त्रुटि के चलेगा।',
          'हम सुविधाओं में बदलाव कर सकते हैं या उन्हें बंद कर सकते हैं। जब हम इन शर्तों में बदलाव करेंगे, तो नया संस्करण प्रकाशित करेंगे और आगे बढ़ने से पहले आपसे उसे स्वीकार करने के लिए कहेंगे।',
        ],
      },
      {
        heading: 'अपना खाता समाप्त करना',
        paragraphs: [
          'आप किसी भी समय Spiriteal का उपयोग बंद कर सकते हैं और हमसे अपना खाता हटाने के लिए कह सकते हैं। आपके डेटा का क्या होता है, यह हमारी गोपनीयता सूचना में बताया गया है।',
        ],
      },
      {
        heading: 'दायित्व',
        paragraphs: [
          `${TO_BE_CONFIRMED}: दायित्व की सीमा, किसी योग्य भारतीय वकील द्वारा तैयार की जानी है। इन शर्तों में कुछ भी भारतीय उपभोक्ता संरक्षण कानून के अंतर्गत आपके किसी ऐसे अधिकार को सीमित नहीं करता जिसे सीमित नहीं किया जा सकता।`,
        ],
      },
      {
        heading: 'कानून और विवाद',
        paragraphs: [
          `ये शर्तें भारत के कानूनों द्वारा शासित हैं। विवाद ${TO_BE_CONFIRMED} (शहर) के न्यायालयों के अधिकार क्षेत्र में होंगे। न्यायालय जाने से पहले कृपया हमसे संपर्क करें ताकि हम मामले को सुलझाने का प्रयास कर सकें।`,
        ],
      },
      {
        heading: 'संपर्क',
        paragraphs: [`इन शर्तों के बारे में प्रश्न: ${TO_BE_CONFIRMED} (सहायता ईमेल पता)।`],
      },
    ],
  },
};
