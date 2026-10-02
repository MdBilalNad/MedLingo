import type { GenerateOptions, LLMClient } from './base.ts';
import { parseReferenceRange, resolveCanonicalName } from '../flagging.ts';

export class MockLLMClient implements LLMClient {
  isAvailable(): boolean {
    return true;
  }

  providerName(): string {
    return 'MedLingo Clinical Reasoning Engine (Mock Local Active)';
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    // 1. Extraction prompt
    if (options?.responseSchema || prompt.includes('Extract every laboratory test')) {
      const extracted = this.extractFromReportText(prompt);
      if (extracted.length > 0) {
        return JSON.stringify({ extracted_tests: extracted });
      }

      // Default baseline tests if no pattern matched
      return JSON.stringify({
        extracted_tests: [
          {
            test_name: 'Hemoglobin',
            raw_name: 'Hemoglobin',
            value: 10.2,
            unit: 'g/dL',
            ref_low: 12.0,
            ref_high: 16.0,
            ref_text: '12.0 - 16.0',
            confidence: 0.98,
          },
          {
            test_name: 'White Blood Cells',
            raw_name: 'WBC Count',
            value: 6.4,
            unit: 'x10^3/uL',
            ref_low: 4.5,
            ref_high: 11.0,
            ref_text: '4.5 - 11.0',
            confidence: 0.96,
          },
        ],
      });
    }

    // 2. Safety check prompt
    if (prompt.includes('safety auditor')) {
      return JSON.stringify({
        safe: true,
        violations: [],
        remediation: null,
      });
    }

    // 3. Dr. MedLingo Chatbot consultation handler
    if (prompt.includes('Dr. MedLingo')) {
      return this.generateDoctorChatResponse(prompt);
    }

    // 4. Multilingual RAG Explanation prompt
    return this.generateExplanationResponse(prompt);
  }

  /**
   * Dynamically parses test lines from the prompt document
   */
  private extractFromReportText(prompt: string): any[] {
    const lines = prompt.split(/\r?\n/);
    const results: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('===') || trimmed.includes('Extract every')) continue;
      if (trimmed.toLowerCase().includes('patient') || trimmed.toLowerCase().includes('doctor') || trimmed.toLowerCase().includes('report text:')) continue;

      // Pattern: TestName  Value  Unit  Range
      const match = trimmed.match(
        /^([A-Za-z0-9\s()\/+-]+?)\s+([<>]?\s*\d+(?:\.\d+)?)\s+([a-zA-Z0-9%^/]+)?\s*([<>]?\s*\d+(?:\.\d+)?\s*(?:-|to)?\s*\d*(?:\.\d+)?)?/i
      );

      if (match) {
        const rawName = match[1].trim();
        const rawVal = match[2].trim().replace(/\s+/g, '');
        const numVal = parseFloat(rawVal.replace(/[<>]/g, ''));

        if (!isNaN(numVal) && rawName.length > 2) {
          const canonical = resolveCanonicalName(rawName);
          const unit = match[3]?.trim() || null;
          const refText = match[4]?.trim() || null;
          const parsed = parseReferenceRange(refText);

          results.push({
            test_name: canonical,
            raw_name: rawName,
            value: numVal,
            unit,
            ref_low: parsed.low,
            ref_high: parsed.high,
            ref_text: refText,
            confidence: 0.96,
          });
        }
      }
    }
    return results;
  }

  /**
   * Generates grounded Dr. MedLingo replies across languages
   */
  private generateDoctorChatResponse(prompt: string): string {
    const isHindi = prompt.includes('hi') || prompt.includes('हिन्दी');
    const isSpanish = prompt.includes('es') || prompt.includes('Español');
    const isArabic = prompt.includes('ar') || prompt.includes('العربية');
    const isFrench = prompt.includes('fr') || prompt.includes('Français');
    const isBengali = prompt.includes('bn') || prompt.includes('বাংলা');
    const isUrdu = prompt.includes('ur') || prompt.includes('اردو');

    const hasCritical = prompt.includes('CRITICAL') || prompt.includes('critical');

    if (isHindi) {
      return `नमस्ते! डॉ. मेडलिगो के रूप में, मैंने आपके लैब परिणामों की गहन समीक्षा की है।

${hasCritical ? '⚠️ **महत्वपूर्ण चेतावनी:** आपकी रिपोर्ट में गंभीर (Critical) स्तर देखा गया है। कृपया बिना किसी देरी के तुरंत नजदीकी आपातकालीन केंद्र या डॉक्टर से संपर्क करें।' : 'आपकी रिपोर्ट में कुछ मान सामान्य सीमा से बाहर हैं, जिनके लिए उचित मार्गदर्शन नीचे दिया गया है:'}

1. **तत्काल कदम:** ${hasCritical ? 'तुरंत चिकित्सीय सहायता लें।' : 'घबराने की आवश्यकता नहीं है। सामान्य दिनचर्या में उचित पानी पिएं, पौष्टिक भोजन लें और भारी शारीरिक तनाव से बचें।'}
2. **खान-पान और जीवनशैली:** यदि हीमोग्लोबिन कम है तो हरी पत्तेदार सब्जियां, चुकंदर और दालें आहार में शामिल करें। यदि कोलेस्ट्रॉल अधिक है तो तली-भुनी चीजें सीमित करें।
3. **चेतावनी वाले लक्षण:** यदि सीने में दर्द, सांस लेने में तकलीफ, अत्यधिक चक्कर या दिल की धड़कन तेज लगे, तो तुरंत अस्पताल जाएं।
4. **डॉक्टर से पूछें:** क्या 4 से 6 सप्ताह बाद दोबारा जांच करानी चाहिए?

मैं आपकी स्वास्थ्य साक्षरता के लिए हमेशा उपस्थित हूँ। क्या आप किसी विशेष लक्षण के बारे में पूछना चाहते हैं?`;
    }

    if (isSpanish) {
      return `¡Hola! Como Dr. MedLingo, he revisado minuciosamente los resultados de su laboratorio.

${hasCritical ? '⚠️ **ALERTA CRÍTICA:** Se detectaron valores en rangos críticos. Le insto a acudir de inmediato al centro de urgencias o consultar a su médico sin demora.' : 'Algunos parámetros se encuentran fuera del intervalo normal esperado:'}

1. **Pasos inmediatos:** ${hasCritical ? 'Busque atención de urgencia inmediatamente.' : 'Mantenga la calma. Asegure una hidratación adecuada y descanse mientras programa su consulta médica.'}
2. **Nutrición y hábitos:** Si la hemoglobina está baja, aumente el consumo de alimentos ricos en hierro (espinacas, legumbres). Si el colesterol está elevado, reduzca grasas saturadas.
3. **Síntomas de alarma:** Consulte a urgencias ante opresión en el pecho, dificultad para respirar, palpitaciones o mareos intensos.
4. **Preguntas para su médico:** ¿Recomienda repetir estas pruebas en un mes para evaluar la evolución?

Estoy a su disposición para aclarar sus dudas. ¿Desea consultar algo más?`;
    }

    if (isArabic) {
      return `مرحباً! بصفتي د. ميدلينجو، قمت بمراجعة نتائج تحاليلك الطبية بكل دقة وعناية.

${hasCritical ? '⚠️ **تنبيه عاجل:** تظهر نتائجك قيماً حرجة تستدعي التوجه الفوري إلى قسم الطوارئ أو التواصل مع طبيبك المعالج دون تأخير.' : 'هناك بعض الفحوصات خارج النطاق المرجعي الطبيعي:'}

1. **الخطوات الفورية:** ${hasCritical ? 'توجه إلى المستشفى الآن للحصول على رعاية مباشرة.' : 'لا داعي للقلق. احرص على شرب كميات كافية من الماء وتجنب الإجهاد البدني الشديد.'}
2. **التغذية ونمط الحياة:** في حال انخفاض الهيموجلوبين، احرص على تناول الخضار الورقية والأغذية الغنية بالحديد. وفي حال ارتفاع الكوليسترول، قلل من الدهون المشبعة.
3. **أعراض تستدعي الحذر:** راجع الطوارئ فوراً إذا شعرت بضيق في التنفس، ألم في الصدر، خفقان غير معتاد أو دوار شديد.
4. **أسئلة لطبيبك:** هل أحتاج لإعادة التحليل بعد شهر لمتابعة التحسن؟

أتمنى لك دوام الصحة والعافية، وأنا هنا للإجابة عن أي استفسار إضافي.`;
    }

    // Default English
    return `Hello! As Dr. MedLingo, I have thoroughly evaluated your laboratory findings.

${hasCritical ? '⚠️ **URGENT CLINICAL PRIORITY:** Your results reflect critical thresholds that require immediate attention. Please contact your physician or visit an urgent care center right now.' : 'A few parameters are outside standard biological intervals:'}

1. **Immediate Actions:** ${hasCritical ? 'Seek professional emergency medical evaluation promptly.' : 'Stay calm. Drink sufficient water, rest, and avoid heavy strenuous workouts until your doctor evaluates these numbers.'}
2. **Diet & Everyday Lifestyle:** If hemoglobin is low, prioritize iron-rich foods (spinach, lentils, lean protein). If cholesterol or triglycerides are elevated, reduce processed carbohydrates and saturated fats.
3. **Red-Flag Symptoms to Monitor:** Go to urgent care immediately if you notice chest pressure, shortness of breath, sudden severe dizziness, or irregular heartbeats.
4. **Key Questions for Your Doctor:** Ask whether a repeat panel is recommended in 4-6 weeks and what personalized lifestyle steps they advise.

I am here to support your health literacy. What other questions can I answer for you?`;
  }

  /**
   * Generates grounded RAG explanations across languages
   */
  private generateExplanationResponse(prompt: string): string {
    const isHindi = prompt.includes('Language: hi') || prompt.includes('"hi"');
    const isSpanish = prompt.includes('Language: es') || prompt.includes('"es"');
    const isArabic = prompt.includes('Language: ar') || prompt.includes('"ar"');
    const isFrench = prompt.includes('Language: fr') || prompt.includes('"fr"');
    const isBengali = prompt.includes('Language: bn') || prompt.includes('"bn"');

    if (isHindi) {
      return JSON.stringify({
        summary:
          'आपकी लैब रिपोर्ट का विश्लेषण पूर्ण हो गया है। अधिकांश परीक्षण सुरक्षित सीमा में हैं, जबकि असामान्य मानों को सरल व्याख्या के साथ नीचे दर्शाया गया है ताकि आप अपने डॉक्टर से सही परामर्श ले सकें।',
        explanations: {
          Hemoglobin:
            'हीमोग्लोबिन (Hemoglobin) शरीर में ऑक्सीजन पहुंचाने का काम करता है। आपका मान सामान्य सीमा से कुछ कम है। कम आयरन युक्त आहार या सामान्य थकान इसके सामान्य कारण हो सकते हैं।',
          Potassium:
            'पोटेशियम (Potassium) हृदय की गति और मांसपेशियों के संचालन के लिए अत्यंत महत्वपूर्ण खनिज है। उच्च स्तर पर तुरंत चिकित्सक से परामर्श लेना आवश्यक है।',
          'Total Cholesterol':
            'कुल कोलेस्ट्रॉल (Total Cholesterol) रक्त में वसा के स्तर को दर्शाता है। बढ़ा हुआ स्तर आहार और व्यायाम में सुधार की आवश्यकता का संकेत देता है।',
        },
        questions_for_doctor: [
          'क्या इस परिणाम के लिए मुझे अपने आहार या जीवनशैली में बदलाव करना चाहिए?',
          'क्या कुछ सप्ताह बाद इन परीक्षणों को दोबारा कराना उचित रहेगा?',
          'क्या मुझे किसी विशेष पूरक (सप्लीमेंट) की आवश्यकता है?',
        ],
      });
    }

    if (isSpanish) {
      return JSON.stringify({
        summary:
          'Se ha completado el análisis de su informe de laboratorio. La mayoría de los valores se encuentran en rangos de referencia, y los parámetros fuera de lo normal han sido resaltados para que los revise con su médico.',
        explanations: {
          Hemoglobin:
            'La Hemoglobina (Hemoglobin) transporta oxígeno por todo el cuerpo. Su nivel está por debajo de lo habitual, lo cual puede deberse a bajo consumo de hierro o fatiga temporal.',
          Potassium:
            'El Potasio (Potassium) regula los latidos cardíacos y la función muscular. Un nivel alterado requiere pronta valoración médica.',
          'Total Cholesterol':
            'El Colesterol Total (Total Cholesterol) mide las grasas en sangre. Su elevación sugiere mejorar la actividad física y reducir grasas saturadas.',
        },
        questions_for_doctor: [
          '¿Qué ajustes en mi alimentación me recomienda según estos análisis?',
          '¿Convendría repetir estos exámenes en 4 a 8 semanas para monitorear?',
          '¿Hay algún medicamento que deba revisar con usted?',
        ],
      });
    }

    if (isArabic) {
      return JSON.stringify({
        summary:
          'تم تحليل نتائج تقريرك المخبري بنجاح. تقع معظم المؤشرات ضمن الحدود الآمنة، وتم تمييز الفحوصات التي تتطلب متابعة مع طبيبك المعالج.',
        explanations: {
          Hemoglobin:
            'الهيموجلوبين (Hemoglobin) هو البروتين المسؤول عن نقل الأكسجين في الدم. انخفاضه الطفيف قد يرتبط بنقص الحديد أو الإرهاق.',
          Potassium:
            'البوتاسيوم (Potassium) عنصر حيوي لتنظيم نبضات القلب وعمل العضلات، وأي قيمة حرجة تستوجب تقييماً طبياً فورياً.',
        },
        questions_for_doctor: [
          'ما هي النصائح الغذائية الأنسب لحالتي بناءً على هذه النتائج؟',
          'هل تنصح بإعادة الفحص بعد عدة أسابيع للتأكد من التحسن؟',
        ],
      });
    }

    // Default English response
    return JSON.stringify({
      summary:
        'Your laboratory test results have been systematically analyzed. Values outside standard biological intervals have been highlighted below with everyday explanations and questions for your doctor.',
      explanations: {
        Hemoglobin:
          'Hemoglobin carries vital oxygen throughout your body. Your value is below the standard reference range. Mild nutritional lack of iron or hydration factors frequently influence this.',
        Potassium:
          'Potassium is an essential mineral that regulates heart rhythm and muscle contraction. Any abnormal value should be discussed promptly with your clinician.',
        'Total Cholesterol':
          'Total Cholesterol measures circulating blood lipids. Elevated levels are commonly managed through dietary adjustments and regular cardiovascular exercise.',
      },
      questions_for_doctor: [
        'What specific lifestyle or dietary changes would best support these results?',
        'Would you recommend scheduling a repeat lab test in 4 to 8 weeks to monitor progress?',
        'Do any of these findings warrant further evaluation or medication review?',
      ],
    });
  }

  async generateFromImage(_imageBase64: string, _mimeType: string, _prompt: string): Promise<string> {
    return JSON.stringify({
      extracted_tests: [
        {
          test_name: 'Hemoglobin',
          raw_name: 'Hemoglobin',
          value: 10.2,
          unit: 'g/dL',
          ref_low: 12.0,
          ref_high: 16.0,
          ref_text: '12.0 - 16.0',
          confidence: 0.95,
        },
        {
          test_name: 'White Blood Cells',
          raw_name: 'WBC Count',
          value: 6.4,
          unit: 'x10^3/uL',
          ref_low: 4.5,
          ref_high: 11.0,
          ref_text: '4.5 - 11.0',
          confidence: 0.95,
        },
        {
          test_name: 'Platelets',
          raw_name: 'Platelets',
          value: 265,
          unit: 'x10^3/uL',
          ref_low: 150,
          ref_high: 450,
          ref_text: '150 - 450',
          confidence: 0.95,
        },
      ],
    });
  }

  async generateSpeech(_text: string, _voiceName?: string): Promise<string | null> {
    return null;
  }
}
