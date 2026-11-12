# Page content added after the first release. Order: ml, hi, fr, de, ar, es, zh, ja, pt, sv.
# Names of people, institutions, journals, venues, theses and paper titles stay in English by design.
import re
P = {}
def addp(en, ml, hi, fr, de, ar, es, zh, ja, pt, sv):
    P[en] = (ml, hi, fr, de, ar, es, zh, ja, pt, sv)

addp("Sun", "ഞായർ", "रवि", "dim", "So", "أحد", "dom", "周日", "日", "dom", "sön")
addp("Mon", "തിങ്കൾ", "सोम", "lun", "Mo", "إثنين", "lun", "周一", "月", "seg", "mån")
addp("Tue", "ചൊവ്വ", "मंगल", "mar", "Di", "ثلاثاء", "mar", "周二", "火", "ter", "tis")
addp("Wed", "ബുധൻ", "बुध", "mer", "Mi", "أربعاء", "mié", "周三", "水", "qua", "ons")
addp("Thu", "വ്യാഴം", "गुरु", "jeu", "Do", "خميس", "jue", "周四", "木", "qui", "tors")
addp("Fri", "വെള്ളി", "शुक्र", "ven", "Fr", "جمعة", "vie", "周五", "金", "sex", "fre")
addp("Sat", "ശനി", "शनि", "sam", "Sa", "سبت", "sáb", "周六", "土", "sáb", "lör")
addp("Verify", "സ്ഥിരീകരിക്കുക", "सत्यापित करें", "Vérifier", "Bestätigen", "تحقق", "Verificar", "验证", "確認", "Verificar", "Verifiera")
addp("Website", "വെബ്സൈറ്റ്", "वेबसाइट", "Site web", "Website", "الموقع الإلكتروني", "Sitio web", "网站", "ウェブサイト", "Site", "Webbplats")
addp("Length", "ദൈർഘ്യം", "अवधि", "Durée", "Dauer", "المدة", "Duración", "时长", "時間の長さ", "Duração", "Längd")
addp("Newsletter", "വാർത്താക്കത്ത്", "न्यूज़लेटर", "Lettre d'information", "Newsletter", "النشرة الإخبارية", "Boletín", "通讯", "ニュースレター", "Newsletter", "Nyhetsbrev")
addp("Visit", "സന്ദർശനം", "भ्रमण", "Visite", "Besuch", "زيارة", "Visita", "访问", "訪問", "Visita", "Besök")
addp("Workshop Handled", "നയിച്ച ശില്പശാല", "संचालित कार्यशाला", "Atelier animé", "Geleiteter Workshop", "ورشة عمل قمتُ بتنفيذها", "Taller impartido", "主讲的研讨会", "担当したワークショップ", "Oficina ministrada", "Genomförd workshop")
addp("Workshop Attended", "പങ്കെടുത്ത ശില്പശാല", "भाग ली गई कार्यशाला", "Atelier suivi", "Besuchter Workshop", "ورشة عمل شاركتُ فيها", "Taller al que asistí", "参加的研讨会", "参加したワークショップ", "Oficina da qual participei", "Workshop som deltagits i")
addp("Languages", "ഭാഷകൾ", "भाषाएँ", "Langues", "Sprachen", "اللغات", "Idiomas", "语言能力", "言語", "Idiomas", "Språk")
addp("English (read, write, speak)", "ഇംഗ്ലീഷ് (വായിക്കാനും എഴുതാനും സംസാരിക്കാനും)", "अंग्रेज़ी (पढ़ना, लिखना, बोलना)", "Anglais (lu, écrit, parlé)", "Englisch (Lesen, Schreiben, Sprechen)", "الإنجليزية (قراءة وكتابة وتحدث)", "Inglés (lectura, escritura y habla)", "英语（读、写、说）", "英語（読む・書く・話す）", "Inglês (leitura, escrita e fala)", "Engelska (läsa, skriva, tala)")
addp("Malayalam (read, write, speak)", "മലയാളം (വായിക്കാനും എഴുതാനും സംസാരിക്കാനും)", "मलयालम (पढ़ना, लिखना, बोलना)", "Malayalam (lu, écrit, parlé)", "Malayalam (Lesen, Schreiben, Sprechen)", "المالايالامية (قراءة وكتابة وتحدث)", "Malayalam (lectura, escritura y habla)", "马拉雅拉姆语（读、写、说）", "マラヤーラム語（読む・書く・話す）", "Malaiala (leitura, escrita e fala)", "Malayalam (läsa, skriva, tala)")
addp("Hindi (read, write, speak)", "ഹിന്ദി (വായിക്കാനും എഴുതാനും സംസാരിക്കാനും)", "हिंदी (पढ़ना, लिखना, बोलना)", "Hindi (lu, écrit, parlé)", "Hindi (Lesen, Schreiben, Sprechen)", "الهندية (قراءة وكتابة وتحدث)", "Hindi (lectura, escritura y habla)", "印地语（读、写、说）", "ヒンディー語（読む・書く・話す）", "Híndi (leitura, escrita e fala)", "Hindi (läsa, skriva, tala)")
addp("Scholarship", "സ്കോളർഷിപ്പ്", "छात्रवृत्ति", "Bourse", "Stipendium", "منحة دراسية", "Beca", "奖学金", "奨学金", "Bolsa de estudos", "Stipendium")
addp("INSPIRE-SHE Scholarship, Department of Science and Technology, 2015 to 2020.", "INSPIRE-SHE സ്കോളർഷിപ്പ്, ഡിപ്പാർട്ട്മെന്റ് ഓഫ് സയൻസ് ആൻഡ് ടെക്നോളജി, 2015 മുതൽ 2020 വരെ.", "INSPIRE-SHE छात्रवृत्ति, विज्ञान और प्रौद्योगिकी विभाग, 2015 से 2020 तक।",
 "Bourse INSPIRE-SHE, Department of Science and Technology, de 2015 à 2020.", "INSPIRE-SHE-Stipendium, Department of Science and Technology, 2015 bis 2020.", "منحة INSPIRE-SHE من Department of Science and Technology، من 2015 إلى 2020.",
 "Beca INSPIRE-SHE, Department of Science and Technology, de 2015 a 2020.", "INSPIRE-SHE 奖学金，Department of Science and Technology，2015 年至 2020 年。", "INSPIRE-SHE 奨学金（Department of Science and Technology）、2015年から2020年まで。",
 "Bolsa INSPIRE-SHE, Department of Science and Technology, de 2015 a 2020.", "INSPIRE-SHE-stipendium, Department of Science and Technology, 2015 till 2020.")
addp("INSPIRE-SHE scholar", "INSPIRE-SHE സ്കോളർ", "INSPIRE-SHE छात्रवृत्तिधारी", "Boursier INSPIRE-SHE", "INSPIRE-SHE-Stipendiat", "حاصل على منحة INSPIRE-SHE", "Becario INSPIRE-SHE", "INSPIRE-SHE 奖学金获得者", "INSPIRE-SHE 奨学生", "Bolsista INSPIRE-SHE", "INSPIRE-SHE-stipendiat")
addp("Scholarship from the Department of Science and Technology, 2015 to 2020.", "ഡിപ്പാർട്ട്മെന്റ് ഓഫ് സയൻസ് ആൻഡ് ടെക്നോളജിയുടെ സ്കോളർഷിപ്പ്, 2015 മുതൽ 2020 വരെ.", "विज्ञान और प्रौद्योगिकी विभाग की छात्रवृत्ति, 2015 से 2020 तक।",
 "Bourse du Department of Science and Technology, de 2015 à 2020.", "Stipendium des Department of Science and Technology, 2015 bis 2020.", "منحة من Department of Science and Technology، من 2015 إلى 2020.",
 "Beca del Department of Science and Technology, de 2015 a 2020.", "Department of Science and Technology 奖学金，2015 年至 2020 年。", "Department of Science and Technology からの奨学金、2015年から2020年まで。",
 "Bolsa do Department of Science and Technology, de 2015 a 2020.", "Stipendium från Department of Science and Technology, 2015 till 2020.")
addp("Scholarship awarded by the Department of Science and Technology, 2015 to 2020.", "ഡിപ്പാർട്ട്മെന്റ് ഓഫ് സയൻസ് ആൻഡ് ടെക്നോളജി നൽകിയ സ്കോളർഷിപ്പ്, 2015 മുതൽ 2020 വരെ.", "विज्ञान और प्रौद्योगिकी विभाग द्वारा प्रदान की गई छात्रवृत्ति, 2015 से 2020 तक।",
 "Bourse attribuée par le Department of Science and Technology, de 2015 à 2020.", "Vom Department of Science and Technology vergebenes Stipendium, 2015 bis 2020.", "منحة مُنحت من Department of Science and Technology، من 2015 إلى 2020.",
 "Beca concedida por el Department of Science and Technology, de 2015 a 2020.", "由 Department of Science and Technology 颁发的奖学金，2015 年至 2020 年。", "Department of Science and Technology が授与した奨学金、2015年から2020年まで。",
 "Bolsa concedida pelo Department of Science and Technology, de 2015 a 2020.", "Stipendium som tilldelats av Department of Science and Technology, 2015 till 2020.")
addp("Fellowships and scholarships held.", "ലഭിച്ച ഫെലോഷിപ്പുകളും സ്കോളർഷിപ്പുകളും.", "प्राप्त फ़ेलोशिप और छात्रवृत्तियाँ।", "Bourses et fellowships obtenus.", "Erhaltene Fellowships und Stipendien.", "الزمالات والمنح الدراسية التي حصلتُ عليها.",
 "Becas y fellowships obtenidos.", "获得的研究资助与奖学金。", "これまでに受けたフェローシップと奨学金。", "Fellowships e bolsas recebidos.", "Fellowships och stipendier som innehafts.")
addp("Fellowships and scholarships", "ഫെലോഷിപ്പുകളും സ്കോളർഷിപ്പുകളും", "फ़ेलोशिप और छात्रवृत्तियाँ", "Bourses et fellowships", "Fellowships und Stipendien", "الزمالات والمنح الدراسية", "Becas y fellowships", "研究资助与奖学金", "フェローシップと奨学金", "Fellowships e bolsas", "Fellowships och stipendier")
addp("Professional memberships", "പ്രൊഫഷണൽ അംഗത്വങ്ങൾ", "व्यावसायिक सदस्यताएँ", "Adhésions professionnelles", "Berufliche Mitgliedschaften", "العضويات المهنية", "Afiliaciones profesionales", "专业学会会员资格", "専門学会の会員資格", "Associações profissionais", "Yrkesmässiga medlemskap")
addp("Memberships", "അംഗത്വങ്ങൾ", "सदस्यताएँ", "Adhésions", "Mitgliedschaften", "العضويات", "Afiliaciones", "会员资格", "会員資格", "Associações", "Medlemskap")
addp("Scientific societies I belong to.", "ഞാൻ അംഗമായ ശാസ്ത്ര സംഘടനകൾ.", "वे वैज्ञानिक संस्थाएँ जिनका मैं सदस्य हूँ।", "Sociétés savantes dont je suis membre.", "Wissenschaftliche Gesellschaften, denen ich angehöre.", "الجمعيات العلمية التي أنتمي إليها.",
 "Sociedades científicas a las que pertenezco.", "我所加入的学术团体。", "所属している学術団体。", "Sociedades científicas das quais faço parte.", "Vetenskapliga sällskap där jag är medlem.")
addp("Member", "അംഗം", "सदस्य", "Membre", "Mitglied", "عضو", "Miembro", "会员", "会員", "Membro", "Medlem")
addp("International scientific society for Earth and space sciences.", "ഭൗമ, ബഹിരാകാശ ശാസ്ത്രങ്ങൾക്കായുള്ള അന്താരാഷ്ട്ര ശാസ്ത്ര സംഘടന.", "पृथ्वी और अंतरिक्ष विज्ञान की अंतरराष्ट्रीय वैज्ञानिक संस्था।",
 "Société scientifique internationale consacrée aux sciences de la Terre et de l'espace.", "Internationale wissenschaftliche Gesellschaft für Erd- und Weltraumwissenschaften.", "جمعية علمية دولية لعلوم الأرض والفضاء.",
 "Sociedad científica internacional dedicada a las ciencias de la Tierra y del espacio.", "地球与空间科学领域的国际学术团体。", "地球・宇宙科学の国際的な学術団体。", "Sociedade científica internacional dedicada às ciências da Terra e do espaço.", "Internationellt vetenskapligt sällskap för jord- och rymdvetenskap.")
addp("Worldwide membership association of wildland fire specialists.", "കാട്ടുതീ വിദഗ്ധരുടെ ലോകവ്യാപക അംഗത്വ സംഘടന.", "वनाग्नि विशेषज्ञों का विश्वव्यापी सदस्यता संगठन।",
 "Association mondiale de spécialistes des feux de forêt et de végétation.", "Weltweiter Mitgliederverband von Fachleuten für Vegetationsbrände.", "رابطة عالمية تضم المتخصصين في حرائق الغابات والأراضي البرية.",
 "Asociación mundial de especialistas en incendios forestales.", "面向野火专家的全球性会员协会。", "野火の専門家による世界的な会員制の協会。", "Associação mundial de especialistas em incêndios florestais.", "Världsomspännande medlemsförening för experter på skogs- och markbränder.")
addp("Professional association for fire ecology and fire science.", "അഗ്നി പരിസ്ഥിതിശാസ്ത്രത്തിനും അഗ്നി ശാസ്ത്രത്തിനുമായുള്ള പ്രൊഫഷണൽ സംഘടന.", "अग्नि पारिस्थितिकी और अग्नि विज्ञान की व्यावसायिक संस्था।",
 "Association professionnelle consacrée à l'écologie du feu et à la science des incendies.", "Berufsverband für Feuerökologie und Brandwissenschaft.", "جمعية مهنية معنية بإيكولوجيا الحرائق وعلم الحرائق.",
 "Asociación profesional de ecología del fuego y ciencia de los incendios.", "致力于火生态学与火灾科学的专业协会。", "火災生態学と火災科学の専門家協会。", "Associação profissional de ecologia do fogo e ciência dos incêndios.", "Yrkesförening för brandekologi och brandvetenskap.")
addp("Secondary Education", "സെക്കൻഡറി വിദ്യാഭ്യാസം", "माध्यमिक शिक्षा", "Enseignement secondaire", "Sekundarstufe I", "التعليم الثانوي (المرحلة الأولى)", "Educación secundaria", "中等教育", "中等教育", "Ensino secundário", "Grundskola")
addp("Class 10", "പത്താം ക്ലാസ്", "कक्षा 10", "Classe 10", "Klasse 10", "الصف العاشر", "Clase 10", "10 年级", "10年生", "Classe 10", "Klass 10")
addp(". Central Board of Secondary Education (CBSE).", ". സെൻട്രൽ ബോർഡ് ഓഫ് സെക്കൻഡറി എഡ്യൂക്കേഷൻ (CBSE).", "। केंद्रीय माध्यमिक शिक्षा बोर्ड (CBSE)।", ". Central Board of Secondary Education (CBSE).", ". Central Board of Secondary Education (CBSE).", ". Central Board of Secondary Education (CBSE).",
 ". Central Board of Secondary Education (CBSE).", "。Central Board of Secondary Education (CBSE)。", "。Central Board of Secondary Education (CBSE)。", ". Central Board of Secondary Education (CBSE).", ". Central Board of Secondary Education (CBSE).")
addp("Fire weather index over the Northwest Himalaya", "വടക്കുപടിഞ്ഞാറൻ ഹിമാലയത്തിലെ അഗ്നി കാലാവസ്ഥാ സൂചിക", "उत्तर-पश्चिम हिमालय पर अग्नि मौसम सूचकांक", "Indice météorologique de feu sur l'Himalaya du Nord-Ouest", "Brandwetterindex über dem nordwestlichen Himalaya",
 "مؤشر طقس الحرائق فوق شمال غرب الهيمالايا", "Índice meteorológico de incendio en el Himalaya noroccidental", "喜马拉雅西北部的火险天气指数", "ヒマラヤ北西部の火災気象指数", "Índice meteorológico de incêndio no Himalaia Noroeste", "Brandvädersindex över nordvästra Himalaya")
addp("Numerical weather prediction based assessment of fire weather conditions over the forests of the Indian Himalayan Region.",
 "ഇന്ത്യൻ ഹിമാലയൻ മേഖലയിലെ വനങ്ങൾക്കു മുകളിലെ അഗ്നി കാലാവസ്ഥാ സാഹചര്യങ്ങളുടെ സംഖ്യാ കാലാവസ്ഥാ പ്രവചനത്തെ ആസ്പദമാക്കിയുള്ള വിലയിരുത്തൽ.", "भारतीय हिमालयी क्षेत्र के वनों पर अग्नि मौसम परिस्थितियों का संख्यात्मक मौसम पूर्वानुमान पर आधारित आकलन।",
 "Évaluation, fondée sur la prévision numérique du temps, des conditions météorologiques propices aux feux au-dessus des forêts de la région himalayenne indienne.", "Auf numerischer Wettervorhersage beruhende Bewertung der Brandwetterbedingungen über den Wäldern der indischen Himalaya-Region.",
 "تقييم لظروف طقس الحرائق فوق غابات منطقة الهيمالايا الهندية يستند إلى التنبؤ العددي بالطقس.", "Evaluación, basada en la predicción meteorológica numérica, de las condiciones meteorológicas de incendio sobre los bosques de la región del Himalaya indio.",
 "基于数值天气预报，对印度喜马拉雅地区森林上空火险天气条件的评估。", "数値天気予報に基づく、インド・ヒマラヤ地域の森林上における火災気象条件の評価。", "Avaliação, baseada em previsão numérica do tempo, das condições meteorológicas de incêndio sobre as florestas da região do Himalaia indiano.",
 "Bedömning av brandväderförhållanden över skogarna i den indiska Himalayaregionen, baserad på numerisk väderprognosmodellering.")
addp("EGUsphere [preprint], egusphere-2026-2474. Received 29 April 2026; discussion started 6 July 2026. Not yet peer reviewed or published.",
 "EGUsphere [പ്രീപ്രിന്റ്], egusphere-2026-2474. 2026 ഏപ്രിൽ 29-ന് ലഭിച്ചു; 2026 ജൂലൈ 6-ന് ചർച്ച ആരംഭിച്ചു. ഇതുവരെ പിയർ റിവ്യൂ ചെയ്യുകയോ പ്രസിദ്ധീകരിക്കുകയോ ചെയ്തിട്ടില്ല.",
 "EGUsphere [प्रीप्रिंट], egusphere-2026-2474। 29 अप्रैल 2026 को प्राप्त; 6 जुलाई 2026 को चर्चा शुरू हुई। अभी तक सहकर्मी समीक्षा या प्रकाशन नहीं हुआ है।",
 "EGUsphere [prépublication], egusphere-2026-2474. Reçu le 29 avril 2026 ; discussion ouverte le 6 juillet 2026. Pas encore évalué par les pairs ni publié.",
 "EGUsphere [Preprint], egusphere-2026-2474. Eingegangen am 29. April 2026; Diskussion eröffnet am 6. Juli 2026. Noch nicht begutachtet oder veröffentlicht.",
 "EGUsphere [نسخة أولية]، egusphere-2026-2474. استُلمت في 29 أبريل 2026؛ بدأت المناقشة في 6 يوليو 2026. لم تخضع بعدُ لمراجعة الأقران ولم تُنشر.",
 "EGUsphere [preprint], egusphere-2026-2474. Recibido el 29 de abril de 2026; debate iniciado el 6 de julio de 2026. Aún sin revisión por pares ni publicación.",
 "EGUsphere [预印本]，egusphere-2026-2474。2026 年 4 月 29 日收稿；2026 年 7 月 6 日开始讨论。尚未经同行评审，也未正式发表。",
 "EGUsphere［プレプリント］、egusphere-2026-2474。2026年4月29日受理、2026年7月6日に討論開始。査読および正式な出版はまだ行われていません。",
 "EGUsphere [pré-publicação], egusphere-2026-2474. Recebido em 29 de abril de 2026; discussão iniciada em 6 de julho de 2026. Ainda sem revisão por pares e sem publicação.",
 "EGUsphere [förtryck], egusphere-2026-2474. Mottaget den 29 april 2026; diskussionen inleddes den 6 juli 2026. Ännu inte kollegialt granskat eller publicerat.")

addp("I am a PhD researcher at the Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. My PhD thesis is titled",
 "ഞാൻ Indian Institute of Technology Roorkee-ലെ Centre of Excellence in Disaster Mitigation and Management (CoEDMM)-ൽ പിഎച്ച്ഡി ഗവേഷകനാണ്. എന്റെ പിഎച്ച്ഡി പ്രബന്ധത്തിന്റെ ശീർഷകം",
 "मैं Indian Institute of Technology Roorkee के Centre of Excellence in Disaster Mitigation and Management (CoEDMM) में पीएचडी शोधकर्ता हूँ। मेरे पीएचडी शोध-प्रबंध का शीर्षक है",
 "Je suis doctorant au Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. Ma thèse de doctorat s'intitule",
 "Ich bin Doktorand am Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. Der Titel meiner Dissertation lautet",
 "أنا باحث دكتوراه في Centre of Excellence in Disaster Mitigation and Management (CoEDMM) بمعهد Indian Institute of Technology Roorkee. عنوان أطروحتي للدكتوراه هو",
 "Soy doctorando en el Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. Mi tesis doctoral se titula",
 "我是 Indian Institute of Technology Roorkee 灾害减缓与管理卓越中心（Centre of Excellence in Disaster Mitigation and Management，CoEDMM）的博士研究生。我的博士论文题为",
 "私は Indian Institute of Technology Roorkee の Centre of Excellence in Disaster Mitigation and Management（CoEDMM）に所属する博士課程の研究者です。博士論文の題目は",
 "Sou doutorando no Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. Minha tese de doutorado se intitula",
 "Jag är doktorand vid Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. Min doktorsavhandling har titeln")
addp(", Assistant Professor, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee",
 ", അസിസ്റ്റന്റ് പ്രൊഫസർ, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee", ", सहायक प्रोफ़ेसर, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee",
 ", professeur assistant, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee", ", Assistant Professor, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee",
 "، أستاذ مساعد، Centre of Excellence in Disaster Mitigation & Management، Indian Institute of Technology Roorkee", ", profesor ayudante, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee",
 "，助理教授，Centre of Excellence in Disaster Mitigation & Management，Indian Institute of Technology Roorkee", "、助教（Assistant Professor）、Centre of Excellence in Disaster Mitigation & Management、Indian Institute of Technology Roorkee",
 ", professor assistente, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee", ", Assistant Professor, Centre of Excellence in Disaster Mitigation & Management, Indian Institute of Technology Roorkee")
addp(", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Indien",
 ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "، Scientist-D، ACARR، CUSAT، Kalamassery، Cochin، Kerala، الهند", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "，Scientist-D，ACARR，CUSAT，Kalamassery，Cochin，Kerala，印度",
 "、Scientist-D、ACARR、CUSAT、Kalamassery、Cochin、Kerala、インド", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Índia", ", Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Indien")
addp(", Associate Professor, School of Civil and Environmental Engineering, IIT Mandi (at",
 ", അസോസിയേറ്റ് പ്രൊഫസർ, School of Civil and Environmental Engineering, IIT Mandi (", ", एसोसिएट प्रोफ़ेसर, School of Civil and Environmental Engineering, IIT Mandi (",
 ", professeur associé, School of Civil and Environmental Engineering, IIT Mandi (à", ", Associate Professor, School of Civil and Environmental Engineering, IIT Mandi (am",
 "، أستاذ مشارك، School of Civil and Environmental Engineering، IIT Mandi (في", ", profesor asociado, School of Civil and Environmental Engineering, IIT Mandi (en",
 "，副教授，School of Civil and Environmental Engineering，IIT Mandi（在", "、准教授（Associate Professor）、School of Civil and Environmental Engineering、IIT Mandi（",
 ", professor associado, School of Civil and Environmental Engineering, IIT Mandi (no", ", Associate Professor, School of Civil and Environmental Engineering, IIT Mandi (vid")
addp("during the thesis)", "-ൽ തീസിസ് കാലത്ത്)", "में थीसिस के दौरान)", "pendant la thèse)", "während der Masterarbeit)", "أثناء إعداد الرسالة)", "durante la tesis)", "撰写论文期间）", "での論文指導時）", "durante a tese)", "under uppsatsen)")
addp("Dr. Pankaj Kumar, Assistant Professor, IISER Bhopal", "ഡോ. പങ്കജ് കുമാർ, അസിസ്റ്റന്റ് പ്രൊഫസർ, IISER Bhopal", "डॉ. पंकज कुमार, सहायक प्रोफ़ेसर, IISER Bhopal", "Dr Pankaj Kumar, professeur assistant, IISER Bhopal", "Dr. Pankaj Kumar, Assistant Professor, IISER Bhopal",
 "د. بانكاج كومار، أستاذ مساعد، IISER Bhopal", "Dr. Pankaj Kumar, profesor ayudante, IISER Bhopal", "Pankaj Kumar 博士，助理教授，IISER Bhopal", "Pankaj Kumar 博士、助教（Assistant Professor）、IISER Bhopal", "Dr. Pankaj Kumar, professor assistente, IISER Bhopal", "Dr. Pankaj Kumar, Assistant Professor, IISER Bhopal")
addp("Dr. M.G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "ഡോ. എം. ജി. മനോജ്, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "डॉ. एम. जी. मनोज, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India",
 "Dr M. G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "Dr. M. G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Indien", "د. إم. جي. مانوج، Scientist-D، ACARR، CUSAT، Kalamassery، Cochin، Kerala، الهند",
 "Dr. M. G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India", "M. G. Manoj 博士，Scientist-D，ACARR，CUSAT，Kalamassery，Cochin，Kerala，印度", "M. G. Manoj 博士、Scientist-D、ACARR、CUSAT、Kalamassery、Cochin、Kerala、インド",
 "Dr. M. G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Índia", "Dr. M. G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, Indien")
addp("Graduate Aptitude Test in Engineering (GATE), Geology", "Graduate Aptitude Test in Engineering (GATE), ജിയോളജി", "Graduate Aptitude Test in Engineering (GATE), भूविज्ञान", "Graduate Aptitude Test in Engineering (GATE), géologie", "Graduate Aptitude Test in Engineering (GATE), Geologie",
 "Graduate Aptitude Test in Engineering (GATE)، الجيولوجيا", "Graduate Aptitude Test in Engineering (GATE), Geología", "Graduate Aptitude Test in Engineering（GATE），地质学", "Graduate Aptitude Test in Engineering（GATE）、地質学", "Graduate Aptitude Test in Engineering (GATE), Geologia", "Graduate Aptitude Test in Engineering (GATE), geologi")
addp("Kerala State Eligibility Test (KSET), Geology, January 2022", "Kerala State Eligibility Test (KSET), ജിയോളജി, 2022 ജനുവരി", "Kerala State Eligibility Test (KSET), भूविज्ञान, जनवरी 2022", "Kerala State Eligibility Test (KSET), géologie, janvier 2022", "Kerala State Eligibility Test (KSET), Geologie, Januar 2022",
 "Kerala State Eligibility Test (KSET)، الجيولوجيا، يناير 2022", "Kerala State Eligibility Test (KSET), Geología, enero de 2022", "Kerala State Eligibility Test（KSET），地质学，2022 年 1 月", "Kerala State Eligibility Test（KSET）、地質学、2022年1月", "Kerala State Eligibility Test (KSET), Geologia, janeiro de 2022", "Kerala State Eligibility Test (KSET), geologi, januari 2022")
addp("BS-MS in Geological Sciences, IISER Kolkata", "ജിയോളജിക്കൽ സയൻസസിൽ BS-MS, IISER Kolkata", "भूवैज्ञानिक विज्ञान में BS-MS, IISER Kolkata", "BS-MS en sciences géologiques, IISER Kolkata", "BS-MS in Geowissenschaften, IISER Kolkata",
 "BS-MS في العلوم الجيولوجية، IISER Kolkata", "BS-MS en Ciencias Geológicas, IISER Kolkata", "地质科学 BS-MS，IISER Kolkata", "地質科学の BS-MS、IISER Kolkata", "BS-MS em Ciências Geológicas, IISER Kolkata", "BS-MS i geovetenskap, IISER Kolkata")
addp("Anandu Prabhakaran presenting his research at CoEDMM, IIT Roorkee", "CoEDMM, IIT Roorkee-ൽ ആനന്ദു പ്രഭാകരൻ തന്റെ ഗവേഷണം അവതരിപ്പിക്കുന്നു", "CoEDMM, IIT Roorkee में अपना शोध प्रस्तुत करते हुए आनंदु प्रभाकरन",
 "Anandu Prabhakaran présentant ses recherches au CoEDMM, IIT Roorkee", "Anandu Prabhakaran stellt seine Forschung am CoEDMM, IIT Roorkee vor", "أنندو برابهاكاران يعرض بحثه في CoEDMM، IIT Roorkee",
 "Anandu Prabhakaran presentando su investigación en el CoEDMM, IIT Roorkee", "Anandu Prabhakaran 在 CoEDMM, IIT Roorkee 介绍自己的研究", "CoEDMM, IIT Roorkee で研究を発表する Anandu Prabhakaran",
 "Anandu Prabhakaran apresentando sua pesquisa no CoEDMM, IIT Roorkee", "Anandu Prabhakaran presenterar sin forskning vid CoEDMM, IIT Roorkee")
addp("CoEDMM review, IIT Roorkee", "CoEDMM റിവ്യൂ, IIT Roorkee", "CoEDMM समीक्षा, IIT Roorkee", "Revue du CoEDMM, IIT Roorkee", "CoEDMM-Review, IIT Roorkee", "مراجعة CoEDMM، IIT Roorkee", "Revisión del CoEDMM, IIT Roorkee", "CoEDMM 评审，IIT Roorkee", "CoEDMM レビュー、IIT Roorkee", "Revisão do CoEDMM, IIT Roorkee", "Granskning av CoEDMM, IIT Roorkee")
addp("Explaining research on wildfire events over the Indian Himalayan Region to Dr. Mrutyunjay Mohapatra, Director General, IMD",
 "ഇന്ത്യൻ ഹിമാലയൻ മേഖലയിലെ കാട്ടുതീ സംഭവങ്ങളെക്കുറിച്ചുള്ള ഗവേഷണം IMD ഡയറക്ടർ ജനറൽ ഡോ. മൃത്യുഞ്ജയ് മൊഹപാത്രയ്ക്ക് വിശദീകരിക്കുന്നു", "भारतीय हिमालयी क्षेत्र में दावानल की घटनाओं पर अपना शोध IMD के महानिदेशक डॉ. मृत्युंजय महापात्र को समझाते हुए",
 "Présentation de mes recherches sur les feux de forêt dans la région himalayenne indienne au Dr Mrutyunjay Mohapatra, directeur général de l'IMD", "Erläuterung meiner Forschung zu Waldbränden in der indischen Himalaya-Region gegenüber Dr. Mrutyunjay Mohapatra, Generaldirektor des IMD",
 "أشرح البحث المتعلق بحرائق الغابات في منطقة الهيمالايا الهندية للدكتور مريتيونجاي موهاباترا، المدير العام لـ IMD", "Explicación de mi investigación sobre incendios forestales en la región del Himalaya indio al Dr. Mrutyunjay Mohapatra, director general del IMD",
 "向 IMD 总干事 Mrutyunjay Mohapatra 博士介绍印度喜马拉雅地区野火事件的研究", "IMD 長官の Mrutyunjay Mohapatra 博士に、インド・ヒマラヤ地域の野火に関する研究を説明している様子", "Explicando a pesquisa sobre incêndios florestais na região do Himalaia indiano ao Dr. Mrutyunjay Mohapatra, diretor-geral do IMD",
 "Jag förklarar min forskning om skogsbränder i den indiska Himalayaregionen för dr Mrutyunjay Mohapatra, generaldirektör för IMD")

# ---------- dates ----------
LO = ['ml', 'hi', 'fr', 'de', 'ar', 'es', 'zh', 'ja', 'pt', 'sv']
MN = {
 'ml': 'ജനുവരി ഫെബ്രുവരി മാർച്ച് ഏപ്രിൽ മേയ് ജൂൺ ജൂലൈ ഓഗസ്റ്റ് സെപ്റ്റംബർ ഒക്ടോബർ നവംബർ ഡിസംബർ'.split(),
 'hi': 'जनवरी फ़रवरी मार्च अप्रैल मई जून जुलाई अगस्त सितंबर अक्टूबर नवंबर दिसंबर'.split(),
 'fr': 'janvier février mars avril mai juin juillet août septembre octobre novembre décembre'.split(),
 'de': 'Januar Februar März April Mai Juni Juli August September Oktober November Dezember'.split(),
 'ar': 'يناير فبراير مارس أبريل مايو يونيو يوليو أغسطس سبتمبر أكتوبر نوفمبر ديسمبر'.split(),
 'es': 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(),
 'pt': 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(),
 'sv': 'januari februari mars april maj juni juli augusti september oktober november december'.split()}
EN = 'January February March April May June July August September October November December'.split()
def mname(l, m): return MN[l][m - 1]
def ymd(l, d, m, y):
    """single full date"""
    if l == 'zh' or l == 'ja': return f'{y}年{m}月{d}日'
    if l == 'ml': return f'{y} {mname(l, m)} {d}'
    if l == 'de': return f'{d}. {mname(l, m)} {y}'
    if l in ('es', 'pt'): return f'{d} de {mname(l, m)} de {y}'
    return f'{d} {mname(l, m)} {y}'
def rng(l, d1, m1, d2, m2, y, conj='to'):
    """prose range: '3 to 7 February 2025', 'to' or 'and' (two days)"""
    same = (m1 == m2)
    if conj == 'and':
        if l in ('zh',): return f'{y}年{m1}月{d1}日和{d2}日'
        if l == 'ja': return f'{y}年{m1}月{d1}日と{d2}日'
        if l == 'ml': return f'{y} {mname(l, m1)} {d1}, {d2}'
        if l == 'fr': return f'{d1} et {d2} {mname(l, m1)} {y}'
        if l == 'de': return f'{d1}. und {d2}. {mname(l, m1)} {y}'
        if l == 'es': return f'{d1} y {d2} de {mname(l, m1)} de {y}'
        if l == 'pt': return f'{d1} e {d2} de {mname(l, m1)} de {y}'
        if l == 'sv': return f'{d1} och {d2} {mname(l, m1)} {y}'
        if l == 'ar': return f'{d1} و{d2} {mname(l, m1)} {y}'
        if l == 'hi': return f'{d1} और {d2} {mname(l, m1)} {y}'
    if l == 'zh': return f'{y}年{m1}月{d1}日至{d2}日' if same else f'{y}年{m1}月{d1}日至{m2}月{d2}日'
    if l == 'ja': return f'{y}年{m1}月{d1}日から{d2}日まで' if same else f'{y}年{m1}月{d1}日から{m2}月{d2}日まで'
    if l == 'ml': return (f'{y} {mname(l, m1)} {d1} മുതൽ {d2} വരെ' if same else f'{y} {mname(l, m1)} {d1} മുതൽ {mname(l, m2)} {d2} വരെ')
    if l == 'hi': return (f'{d1} से {d2} {mname(l, m1)} {y}' if same else f'{d1} {mname(l, m1)} से {d2} {mname(l, m2)} {y}')
    if l == 'fr': return (f'du {d1} au {d2} {mname(l, m1)} {y}' if same else f'du {d1} {mname(l, m1)} au {d2} {mname(l, m2)} {y}')
    if l == 'de': return (f'vom {d1}. bis {d2}. {mname(l, m1)} {y}' if same else f'vom {d1}. {mname(l, m1)} bis {d2}. {mname(l, m2)} {y}')
    if l == 'ar': return (f'من {d1} إلى {d2} {mname(l, m1)} {y}' if same else f'من {d1} {mname(l, m1)} إلى {d2} {mname(l, m2)} {y}')
    if l == 'es': return (f'del {d1} al {d2} de {mname(l, m1)} de {y}' if same else f'del {d1} de {mname(l, m1)} al {d2} de {mname(l, m2)} de {y}')
    if l == 'pt': return (f'de {d1} a {d2} de {mname(l, m1)} de {y}' if same else f'de {d1} de {mname(l, m1)} a {d2} de {mname(l, m2)} de {y}')
    if l == 'sv': return (f'{d1} till {d2} {mname(l, m1)} {y}' if same else f'{d1} {mname(l, m1)} till {d2} {mname(l, m2)} {y}')
def my(l, m, y):
    if l in ('zh', 'ja'): return f'{y}年{m}月'
    if l == 'ml': return f'{y} {mname(l, m)}'
    if l in ('es', 'pt'): return f'{mname(l, m)} de {y}'
    return f'{mname(l, m)} {y}'
def hy(l, d1, m1, d2, m2, y):
    """compact range as shown in the tables: '03-07 February 2025' or '31 January - 08 February 2024'"""
    a, b = str(d1).zfill(2) if False else d1, d2
    if l in ('zh', 'ja'):
        return f'{y}年{m1}月{a}-{b}日' if m1 == m2 else f'{y}年{m1}月{a}日-{m2}月{b}日'
    if l == 'ml':
        return f'{y} {mname(l, m1)} {a}-{b}' if m1 == m2 else f'{y} {mname(l, m1)} {a} - {mname(l, m2)} {b}'
    if l == 'de':
        return f'{a}.-{b}. {mname(l, m1)} {y}' if m1 == m2 else f'{a}. {mname(l, m1)} - {b}. {mname(l, m2)} {y}'
    if l in ('es', 'pt'):
        return f'{a}-{b} de {mname(l, m1)} de {y}' if m1 == m2 else f'{a} de {mname(l, m1)} - {b} de {mname(l, m2)} de {y}'
    return f'{a}-{b} {mname(l, m1)} {y}' if m1 == m2 else f'{a} {mname(l, m1)} - {b} {mname(l, m2)} {y}'
def adddate(en, fn):
    P[en] = tuple(fn(l) for l in LO)
_mi = lambda s: EN.index(s) + 1
_DATES = [
 ('03-07 February 2025', 3, 2, 7, 2, 2025), ('28-31 October 2026', 28, 10, 31, 10, 2026), ('10-16 October 2025', 10, 10, 16, 10, 2025), ('21-25 October 2024', 21, 10, 25, 10, 2024),
 ('14-20 October 2024', 14, 10, 20, 10, 2024), ('24-25 September 2024', 24, 9, 25, 9, 2024), ('31 January - 08 February 2024', 31, 1, 8, 2, 2024), ('16-20 October 2023', 16, 10, 20, 10, 2023),
 ('7 August - 01 November 2023', 7, 8, 1, 11, 2023), ('02-08 January 2023', 2, 1, 8, 1, 2023), ('10-12 April 2023', 10, 4, 12, 4, 2023)]
for en, d1, m1, d2, m2, y in _DATES: adddate(en, lambda l, a=(d1, m1, d2, m2, y): hy(l, *a))
adddate('November 2026', lambda l: my(l, 11, 2026))

# ---------- workshop titles (descriptive titles are translated; acronyms and proper names stay) ----------
TT = {}
def title(en, *t):
    assert len(t) == 10, en
    TT[en] = dict(zip(LO, t)); P[en] = tuple(t)
title("Climate Change Science and Weather Extremes: How Numerical Models Predict What Comes Next?",
 "കാലാവസ്ഥാ വ്യതിയാന ശാസ്ത്രവും അതിതീവ്ര കാലാവസ്ഥയും: സംഖ്യാ മോഡലുകൾ അടുത്തതെന്തെന്ന് എങ്ങനെ പ്രവചിക്കുന്നു?", "जलवायु परिवर्तन विज्ञान और चरम मौसम: संख्यात्मक मॉडल आगे क्या होगा, इसका पूर्वानुमान कैसे लगाते हैं?",
 "Science du changement climatique et phénomènes météorologiques extrêmes : comment les modèles numériques prévoient-ils ce qui vient ?", "Klimawandelforschung und Wetterextreme: Wie sagen numerische Modelle voraus, was als Nächstes kommt?",
 "علم تغيّر المناخ والظواهر الجوية المتطرفة: كيف تتنبأ النماذج العددية بما سيأتي؟", "Ciencia del cambio climático y extremos meteorológicos: ¿cómo predicen los modelos numéricos lo que viene?",
 "气候变化科学与极端天气：数值模式如何预测未来？", "気候変動科学と極端気象：数値モデルは次に何が起こるかをどのように予測するのか", "Ciência das mudanças climáticas e extremos do tempo: como os modelos numéricos preveem o que vem a seguir?",
 "Klimatförändringsforskning och extremt väder: hur förutsäger numeriska modeller vad som kommer härnäst?")
title("Numerical Weather Prediction Models in the Changing Climate: Applications, Simulation and Case Study",
 "മാറുന്ന കാലാവസ്ഥയിലെ സംഖ്യാ കാലാവസ്ഥാ പ്രവചന മോഡലുകൾ: പ്രയോഗങ്ങൾ, സിമുലേഷൻ, കേസ് സ്റ്റഡി", "बदलते जलवायु में संख्यात्मक मौसम पूर्वानुमान मॉडल: अनुप्रयोग, सिमुलेशन और केस स्टडी",
 "Les modèles de prévision numérique du temps dans un climat en évolution : applications, simulation et étude de cas", "Numerische Wettervorhersagemodelle im sich wandelnden Klima: Anwendungen, Simulation und Fallstudie",
 "نماذج التنبؤ العددي بالطقس في ظل مناخ متغيّر: التطبيقات والمحاكاة ودراسة حالة", "Modelos de predicción meteorológica numérica en un clima cambiante: aplicaciones, simulación y estudio de caso",
 "气候变化背景下的数值天气预报模式：应用、模拟与案例研究", "変化する気候における数値天気予報モデル：応用、シミュレーション、事例研究", "Modelos de previsão numérica do tempo em um clima em mudança: aplicações, simulação e estudo de caso",
 "Numeriska väderprognosmodeller i ett förändrat klimat: tillämpningar, simulering och fallstudie")
title("Introduction to Numerical Weather Prediction Models and Weather Research and Forecasting Model as a tool for Extreme Event Analysis",
 "സംഖ്യാ കാലാവസ്ഥാ പ്രവചന മോഡലുകളിലേക്കും അതിതീവ്ര സംഭവങ്ങളുടെ വിശകലനത്തിനുള്ള ഉപകരണമായ Weather Research and Forecasting മോഡലിലേക്കുമുള്ള ആമുഖം",
 "संख्यात्मक मौसम पूर्वानुमान मॉडलों का परिचय और चरम घटनाओं के विश्लेषण के उपकरण के रूप में Weather Research and Forecasting मॉडल",
 "Introduction aux modèles de prévision numérique du temps et au modèle Weather Research and Forecasting comme outil d'analyse des événements extrêmes", "Einführung in numerische Wettervorhersagemodelle und das Weather Research and Forecasting Model als Werkzeug zur Analyse von Extremereignissen",
 "مدخل إلى نماذج التنبؤ العددي بالطقس ونموذج Weather Research and Forecasting بوصفه أداة لتحليل الأحداث المتطرفة", "Introducción a los modelos de predicción meteorológica numérica y al modelo Weather Research and Forecasting como herramienta para analizar eventos extremos",
 "数值天气预报模式简介，以及作为极端事件分析工具的 Weather Research and Forecasting 模式", "数値天気予報モデルの入門と、極端現象の解析ツールとしての Weather Research and Forecasting モデル", "Introdução aos modelos de previsão numérica do tempo e ao modelo Weather Research and Forecasting como ferramenta de análise de eventos extremos",
 "Introduktion till numeriska väderprognosmodeller och Weather Research and Forecasting-modellen som verktyg för analys av extrema händelser")
title("Introduction to Disaster Mitigation & Management, Climate Change and California Wildfire Analysis",
 "ദുരന്ത ലഘൂകരണത്തിനും മാനേജ്മെന്റിനും കാലാവസ്ഥാ വ്യതിയാനത്തിനും കാലിഫോർണിയ കാട്ടുതീ വിശകലനത്തിനുമുള്ള ആമുഖം", "आपदा न्यूनीकरण और प्रबंधन, जलवायु परिवर्तन और कैलिफ़ोर्निया दावानल विश्लेषण का परिचय",
 "Introduction à l'atténuation et à la gestion des catastrophes, au changement climatique et à l'analyse des incendies en Californie", "Einführung in Katastrophenvorsorge und Katastrophenmanagement, Klimawandel und die Analyse der Waldbrände in Kalifornien",
 "مدخل إلى الحد من الكوارث وإدارتها وتغيّر المناخ وتحليل حرائق الغابات في كاليفورنيا", "Introducción a la mitigación y gestión de desastres, el cambio climático y el análisis de los incendios forestales de California",
 "灾害减缓与管理、气候变化及加利福尼亚野火分析导论", "災害の軽減と管理、気候変動、カリフォルニア山火事の解析入門", "Introdução à mitigação e gestão de desastres, mudanças climáticas e análise dos incêndios florestais da Califórnia",
 "Introduktion till katastrofförebyggande och krishantering, klimatförändringar och analys av skogsbränderna i Kalifornien")
title("Python Essentials: Foundations of Programming, Data Structures, and Analysis",
 "Python അടിസ്ഥാനങ്ങൾ: പ്രോഗ്രാമിംഗ്, ഡാറ്റ ഘടനകൾ, വിശകലനം എന്നിവയുടെ അടിത്തറ", "Python की अनिवार्य बातें: प्रोग्रामिंग, डेटा संरचनाओं और विश्लेषण की बुनियाद", "Les essentiels de Python : fondements de la programmation, structures de données et analyse",
 "Python-Grundlagen: Programmierung, Datenstrukturen und Analyse", "أساسيات Python: أسس البرمجة وهياكل البيانات والتحليل", "Fundamentos de Python: bases de la programación, estructuras de datos y análisis", "Python 基础：编程基础、数据结构与数据分析",
 "Python の基本：プログラミングの基礎、データ構造、データ解析", "Fundamentos de Python: bases de programação, estruturas de dados e análise", "Python i grunden: programmeringens grunder, datastrukturer och analys")
title("System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), Day 02, Hands-on Session on WRF Model",
 "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), രണ്ടാം ദിവസം, WRF മോഡലിൽ പ്രായോഗിക സെഷൻ", "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), दूसरा दिन, WRF मॉडल पर प्रायोगिक सत्र",
 "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), jour 2, séance pratique sur le modèle WRF", "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), Tag 2, praktische Sitzung zum WRF-Modell",
 "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT)، اليوم الثاني، جلسة عملية حول نموذج WRF", "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), día 2, sesión práctica sobre el modelo WRF",
 "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques（SURE-ALERT），第 2 天，WRF 模式上机实践", "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques（SURE-ALERT）、2日目、WRF モデルの実習",
 "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), dia 2, sessão prática sobre o modelo WRF", "System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), dag 2, praktisk övning i WRF-modellen")
title("R language and Origin Pro", "R ഭാഷയും Origin Pro-യും", "R भाषा और Origin Pro", "Langage R et Origin Pro", "Die Sprache R und Origin Pro", "لغة R وبرنامج Origin Pro", "Lenguaje R y Origin Pro", "R 语言与 Origin Pro", "R 言語と Origin Pro", "Linguagem R e Origin Pro", "Språket R och Origin Pro")
title("Hands-on Workshop on Weather Prediction and Climate Model",
 "കാലാവസ്ഥാ പ്രവചനത്തെയും ക്ലൈമറ്റ് മോഡലിനെയും കുറിച്ചുള്ള പ്രായോഗിക ശില്പശാല", "मौसम पूर्वानुमान और जलवायु मॉडल पर प्रायोगिक कार्यशाला", "Atelier pratique sur la prévision du temps et les modèles climatiques", "Praktischer Workshop zu Wettervorhersage und Klimamodell",
 "ورشة عمل تطبيقية حول التنبؤ بالطقس ونماذج المناخ", "Taller práctico sobre predicción del tiempo y modelos climáticos", "天气预报与气候模式实操研讨会", "天気予報と気候モデルの実習ワークショップ", "Oficina prática sobre previsão do tempo e modelos climáticos", "Praktisk workshop om väderprognoser och klimatmodeller")
title("FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA Workshop on WRF",
 "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, WRF-നെക്കുറിച്ചുള്ള ശില്പശാല", "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, WRF पर कार्यशाला",
 "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, atelier sur WRF", "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, Workshop zu WRF",
 "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA، ورشة عمل حول WRF", "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, taller sobre WRF",
 "FOREcaSting and Early-Warning of Extreme Events and Disasters（FORESEED）KARYASHALA，WRF 研讨会", "FOREcaSting and Early-Warning of Extreme Events and Disasters（FORESEED）KARYASHALA、WRF ワークショップ",
 "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, oficina sobre WRF", "FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA, workshop om WRF")
title("Technical Workshop on Earthquake Early Warning System (EEWS)",
 "ഭൂകമ്പ മുന്നറിയിപ്പ് സംവിധാനത്തെക്കുറിച്ചുള്ള (EEWS) സാങ്കേതിക ശില്പശാല", "भूकंप पूर्व चेतावनी प्रणाली (EEWS) पर तकनीकी कार्यशाला", "Atelier technique sur le système d'alerte précoce aux séismes (EEWS)",
 "Technischer Workshop zum Erdbebenfrühwarnsystem (EEWS)", "ورشة عمل فنية حول نظام الإنذار المبكر بالزلازل (EEWS)", "Taller técnico sobre el sistema de alerta temprana de terremotos (EEWS)", "地震预警系统（EEWS）技术研讨会",
 "地震早期警戒システム（EEWS）に関する技術ワークショップ", "Oficina técnica sobre o sistema de alerta precoce de terremotos (EEWS)", "Teknisk workshop om system för tidig jordbävningsvarning (EEWS)")
title("Workshop on Data Assimilation in Weather and Climate models",
 "കാലാവസ്ഥാ, ക്ലൈമറ്റ് മോഡലുകളിലെ ഡാറ്റ അസിമിലേഷൻ ശില്പശാല", "मौसम और जलवायु मॉडलों में डेटा आत्मसातीकरण पर कार्यशाला", "Atelier sur l'assimilation de données dans les modèles météorologiques et climatiques",
 "Workshop zur Datenassimilation in Wetter- und Klimamodellen", "ورشة عمل حول استيعاب البيانات في نماذج الطقس والمناخ", "Taller sobre asimilación de datos en modelos meteorológicos y climáticos", "天气与气候模式中的资料同化研讨会",
 "気象・気候モデルにおけるデータ同化のワークショップ", "Oficina sobre assimilação de dados em modelos de tempo e clima", "Workshop om dataassimilation i väder- och klimatmodeller")
title("Wildfire spread over mountainous India", "ഇന്ത്യയിലെ മലയോര പ്രദേശങ്ങളിൽ കാട്ടുതീ പടരുന്നത്", "पर्वतीय भारत में दावानल का फैलाव", "Propagation des feux de forêt dans l'Inde montagneuse", "Ausbreitung von Waldbränden im Bergland Indiens",
 "انتشار حرائق الغابات في المناطق الجبلية في الهند", "Propagación de incendios forestales en la India montañosa", "印度山区的野火蔓延", "インドの山岳地域における野火の拡大", "Propagação de incêndios florestais na Índia montanhosa", "Spridning av skogsbränder i Indiens bergsområden")
addp("Impact of El Niño Southern Oscillation and Indian ocean dipole on wildfire across the Indian forests.",
 "El Niño ദക്ഷിണ ദോലനവും ഇന്ത്യൻ മഹാസമുദ്ര ദ്വിധ്രുവവും ഇന്ത്യയിലെ വനങ്ങളിലെ കാട്ടുതീയിൽ ചെലുത്തുന്ന സ്വാധീനം.", "अल नीनो दक्षिणी दोलन और हिंद महासागर द्विध्रुव का भारत के वनों में दावानल पर प्रभाव।",
 "Influence de l'oscillation australe El Niño et du dipôle de l'océan Indien sur les feux de forêt dans les forêts indiennes.", "Einfluss der El-Niño-Southern-Oscillation und des Indischen-Ozean-Dipols auf Waldbrände in den Wäldern Indiens.",
 "أثر التذبذب الجنوبي لظاهرة النينيو وثنائي القطب في المحيط الهندي على حرائق الغابات في الغابات الهندية.", "Influencia de El Niño-Oscilación del Sur y del dipolo del océano Índico en los incendios forestales de la India.",
 "厄尔尼诺-南方涛动与印度洋偶极子对印度森林野火的影响。", "エルニーニョ・南方振動とインド洋ダイポールが、インドの森林における野火に及ぼす影響。", "Influência do El Niño-Oscilação Sul e do dipolo do Oceano Índico nos incêndios florestais das florestas indianas.",
 "El Niño–Southern Oscillation och Indiska oceanens dipol: påverkan på skogsbränder i Indiens skogar.")

# ---------- captions and alt texts ----------
def cap(en, *t):
    assert len(t) == 10, en
    P[en] = tuple(t)
T1 = "Climate Change Science and Weather Extremes: How Numerical Models Predict What Comes Next?"
T2 = "Numerical Weather Prediction Models in the Changing Climate: Applications, Simulation and Case Study"
T5 = "Python Essentials: Foundations of Programming, Data Structures, and Analysis"
T12 = "Workshop on Data Assimilation in Weather and Climate models"
T11 = "Technical Workshop on Earthquake Early Warning System (EEWS)"
def tt(k): return [TT[k][l] for l in LO]
def comp(en, f):
    cap(en, *[f(l) for l in LO])
SEP = {'zh': '，', 'ja': '、', 'ar': '، '}
def j(l, *parts, end='.'):
    s = (SEP.get(l, ', ')).join(parts)
    return s + {'zh': '。', 'ja': '。'}.get(l, end)
VEN = {  # untranslated institutional names
 'bbau': 'School of Earth and Environmental Sciences (SEES), Babasaheb Bhimrao Ambedkar University, Lucknow',
 'doon': 'School of Environment and Natural Resources, Doon University',
 'cusat': 'School of Environmental Studies, Cochin University of Science and Technology (CUSAT), Cochin'}
comp(T1 + ", " + VEN['bbau'] + ", November 2026.", lambda l: j(l, TT[T1][l], VEN['bbau'], my(l, 11, 2026), end='.').replace('?,', '?,'))
comp(T2 + ", " + VEN['doon'] + ", 28 to 31 October 2026.", lambda l: j(l, TT[T2][l], VEN['doon'], rng(l, 28, 10, 31, 10, 2026)))
_ws = {'ml': 'ശില്പശാല', 'hi': 'कार्यशाला', 'fr': 'Atelier', 'de': 'Workshop', 'ar': 'ورشة عمل', 'es': 'Taller', 'zh': '研讨会', 'ja': 'ワークショップ', 'pt': 'Oficina', 'sv': 'Workshop'}
comp("Workshop " + T5 + ", School of Environmental Studies, Cochin University of Science and Technology (CUSAT), Cochin, 24 and 25 September 2024.",
 lambda l: j(l, (_ws[l] + ' ' + TT[T5][l]) if l not in ('ml', 'hi', 'zh', 'ja', 'ar') else (TT[T5][l] + ' ' + _ws[l]), VEN['cusat'], rng(l, 24, 9, 25, 9, 2024, 'and')))
comp(T12 + ", ICTS Bengaluru, 6 to 17 May 2024.", lambda l: j(l, TT[T12][l], 'ICTS Bengaluru', rng(l, 6, 5, 17, 5, 2024)))
comp(T11 + ", CoEDMM, IIT Roorkee, 10 to 12 April 2023.", lambda l: j(l, TT[T11][l], 'CoEDMM, IIT Roorkee', rng(l, 10, 4, 12, 4, 2023)))
_ls = {'ml': 'കാലാവസ്ഥാ വ്യതിയാനത്തെക്കുറിച്ചുള്ള പ്രഭാഷണ പരമ്പര', 'hi': 'जलवायु परिवर्तन पर व्याख्यान श्रृंखला', 'fr': 'Série de conférences sur le changement climatique', 'de': 'Vortragsreihe zum Klimawandel',
 'ar': 'سلسلة محاضرات عن تغيّر المناخ', 'es': 'Ciclo de conferencias sobre el cambio climático', 'zh': '气候变化系列讲座', 'ja': '気候変動に関する連続講義', 'pt': 'Série de palestras sobre mudanças climáticas', 'sv': 'Föreläsningsserie om klimatförändringar'}
comp("Lecture series on Climate Change, Department of Environmental Studies, Kannur University, 3 to 7 February 2025.", lambda l: j(l, _ls[l], 'Department of Environmental Studies, Kannur University', rng(l, 3, 2, 7, 2, 2025)))
cap("PMRF Annual Symposium, IIT Hyderabad, 16 and 17 March 2025. Several hundred PMRF fellows from across India attended.",
 f"PMRF വാർഷിക സിമ്പോസിയം, IIT Hyderabad, {rng('ml',16,3,17,3,2025,'and')}. ഇന്ത്യയിലുടനീളമുള്ള നൂറുകണക്കിന് PMRF ഫെലോകൾ പങ്കെടുത്തു.",
 f"PMRF वार्षिक संगोष्ठी, IIT Hyderabad, {rng('hi',16,3,17,3,2025,'and')}। पूरे भारत से कई सौ PMRF फ़ेलो शामिल हुए।",
 f"Symposium annuel du PMRF, IIT Hyderabad, {rng('fr',16,3,17,3,2025,'and')}. Plusieurs centaines de boursiers PMRF venus de toute l'Inde y ont participé.",
 f"Jährliches PMRF-Symposium, IIT Hyderabad, {rng('de',16,3,17,3,2025,'and')}. Mehrere hundert PMRF-Stipendiaten aus ganz Indien nahmen teil.",
 f"الندوة السنوية لـ PMRF، IIT Hyderabad، {rng('ar',16,3,17,3,2025,'and')}. شارك فيها عدة مئات من زملاء PMRF من أنحاء الهند.",
 f"Simposio anual del PMRF, IIT Hyderabad, {rng('es',16,3,17,3,2025,'and')}. Asistieron varios cientos de becarios del PMRF de toda la India.",
 f"PMRF 年度研讨会，IIT Hyderabad，{rng('zh',16,3,17,3,2025,'and')}。来自印度各地的数百名 PMRF 学者参加。",
 f"PMRF 年次シンポジウム、IIT Hyderabad、{rng('ja',16,3,17,3,2025,'and')}。インド全土から数百人の PMRF フェローが参加しました。",
 f"Simpósio Anual do PMRF, IIT Hyderabad, {rng('pt',16,3,17,3,2025,'and')}. Várias centenas de bolsistas do PMRF de toda a Índia participaram.",
 f"Årligt PMRF-symposium, IIT Hyderabad, {rng('sv',16,3,17,3,2025,'and')}. Flera hundra PMRF-stipendiater från hela Indien deltog.")
cap("IDDRR 2026 and Research Scholars' Day, CoEDMM, IIT Roorkee. Theme: Resilience starts at home.",
 "IDDRR 2026-ഉം റിസർച്ച് സ്കോളേഴ്സ് ഡേയും, CoEDMM, IIT Roorkee. പ്രമേയം: പ്രതിരോധശേഷി തുടങ്ങുന്നത് വീട്ടിൽ നിന്നാണ്.", "IDDRR 2026 और रिसर्च स्कॉलर्स डे, CoEDMM, IIT Roorkee। विषय: सहनशीलता की शुरुआत घर से होती है।",
 "IDDRR 2026 et Journée des doctorants (Research Scholars' Day), CoEDMM, IIT Roorkee. Thème : la résilience commence chez soi.", "IDDRR 2026 und Research Scholars' Day, CoEDMM, IIT Roorkee. Thema: Resilienz beginnt zu Hause.",
 "IDDRR 2026 ويوم الباحثين (Research Scholars' Day)، CoEDMM، IIT Roorkee. الموضوع: المرونة تبدأ من المنزل.", "IDDRR 2026 y Día de los Investigadores (Research Scholars' Day), CoEDMM, IIT Roorkee. Lema: la resiliencia empieza en casa.",
 "IDDRR 2026 暨研究学者日（Research Scholars' Day），CoEDMM，IIT Roorkee。主题：韧性始于家庭。", "IDDRR 2026 と研究者デー（Research Scholars' Day）、CoEDMM、IIT Roorkee。テーマ：レジリエンスは家庭から始まる。",
 "IDDRR 2026 e Dia dos Pesquisadores (Research Scholars' Day), CoEDMM, IIT Roorkee. Tema: a resiliência começa em casa.", "IDDRR 2026 och Research Scholars' Day, CoEDMM, IIT Roorkee. Tema: Motståndskraft börjar hemma.")
cap("IDDRR 2024 and Research Scholars' Day, CoEDMM, IIT Roorkee. Theme: Empowering the next generation for a resilient future.",
 "IDDRR 2024-ഉം റിസർച്ച് സ്കോളേഴ്സ് ഡേയും, CoEDMM, IIT Roorkee. പ്രമേയം: പ്രതിരോധശേഷിയുള്ള ഭാവിക്കായി അടുത്ത തലമുറയെ ശാക്തീകരിക്കുക.", "IDDRR 2024 और रिसर्च स्कॉलर्स डे, CoEDMM, IIT Roorkee। विषय: सहनशील भविष्य के लिए अगली पीढ़ी को सशक्त बनाना।",
 "IDDRR 2024 et Journée des doctorants (Research Scholars' Day), CoEDMM, IIT Roorkee. Thème : donner à la nouvelle génération les moyens de bâtir un avenir résilient.", "IDDRR 2024 und Research Scholars' Day, CoEDMM, IIT Roorkee. Thema: die nächste Generation für eine widerstandsfähige Zukunft stärken.",
 "IDDRR 2024 ويوم الباحثين (Research Scholars' Day)، CoEDMM، IIT Roorkee. الموضوع: تمكين الجيل القادم من أجل مستقبل قادر على الصمود.", "IDDRR 2024 y Día de los Investigadores (Research Scholars' Day), CoEDMM, IIT Roorkee. Lema: empoderar a la próxima generación para un futuro resiliente.",
 "IDDRR 2024 暨研究学者日（Research Scholars' Day），CoEDMM，IIT Roorkee。主题：赋能下一代，共建具有韧性的未来。", "IDDRR 2024 と研究者デー（Research Scholars' Day）、CoEDMM、IIT Roorkee。テーマ：レジリエントな未来のために次世代に力を。",
 "IDDRR 2024 e Dia dos Pesquisadores (Research Scholars' Day), CoEDMM, IIT Roorkee. Tema: capacitar a próxima geração para um futuro resiliente.", "IDDRR 2024 och Research Scholars' Day, CoEDMM, IIT Roorkee. Tema: Stärk nästa generation för en motståndskraftig framtid.")
cap("My presentation on forest fire events over the northwest Himalayan region and the Hawaii forest fires at the 13th International Conference of the International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, 28 to 30 September 2023.",
 f"വടക്കുപടിഞ്ഞാറൻ ഹിമാലയൻ മേഖലയിലെ കാട്ടുതീ സംഭവങ്ങളെയും ഹവായിയിലെ കാട്ടുതീയെയും കുറിച്ചുള്ള എന്റെ അവതരണം; International Society for Integrated Disaster Risk Management-ന്റെ 13-ാമത് അന്താരാഷ്ട്ര സമ്മേളനം (IDRiM 2023), IIT Roorkee, {rng('ml',28,9,30,9,2023)}.",
 f"उत्तर-पश्चिम हिमालयी क्षेत्र में वनाग्नि की घटनाओं और हवाई के जंगल की आग पर मेरी प्रस्तुति; International Society for Integrated Disaster Risk Management का 13वाँ अंतरराष्ट्रीय सम्मेलन (IDRiM 2023), IIT Roorkee, {rng('hi',28,9,30,9,2023)}।",
 f"Ma présentation sur les feux de forêt dans la région himalayenne du nord-ouest et sur les incendies d'Hawaï, lors de la 13e Conférence internationale de l'International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, {rng('fr',28,9,30,9,2023)}.",
 f"Mein Vortrag über Waldbrände in der nordwestlichen Himalaya-Region und die Waldbrände auf Hawaii bei der 13. Internationalen Konferenz der International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, {rng('de',28,9,30,9,2023)}.",
 f"عرضي التقديمي عن حرائق الغابات في منطقة شمال غرب الهيمالايا وحرائق غابات هاواي في المؤتمر الدولي الثالث عشر للجمعية الدولية للإدارة المتكاملة لمخاطر الكوارث (IDRiM 2023)، IIT Roorkee، {rng('ar',28,9,30,9,2023)}.",
 f"Mi presentación sobre los incendios forestales en la región del Himalaya noroccidental y los de Hawái en la 13.ª Conferencia Internacional de la International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, {rng('es',28,9,30,9,2023)}.",
 f"我在 International Society for Integrated Disaster Risk Management 第 13 届国际会议（IDRiM 2023）上作报告，介绍喜马拉雅西北部地区的森林火灾和夏威夷森林火灾，IIT Roorkee，{rng('zh',28,9,30,9,2023)}。",
 f"International Society for Integrated Disaster Risk Management の第13回国際会議（IDRiM 2023）、IIT Roorkee、{rng('ja',28,9,30,9,2023)}での、ヒマラヤ北西部の森林火災とハワイの森林火災に関する私の発表。",
 f"Minha apresentação sobre os incêndios florestais na região noroeste do Himalaia e os incêndios florestais do Havaí na 13.ª Conferência Internacional da International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, {rng('pt',28,9,30,9,2023)}.",
 f"Min presentation om skogsbränderna i den nordvästra Himalayaregionen och skogsbränderna på Hawaii vid den 13:e internationella konferensen för International Society for Integrated Disaster Risk Management (IDRiM 2023), IIT Roorkee, {rng('sv',28,9,30,9,2023)}.")

_k = "Workshop " + T5 + ", School of Environmental Studies, Cochin University of Science and Technology (CUSAT), Cochin, 24 and 25 September 2024."
P[_k] = tuple((j(l, _ws[l] + ': ' + TT[T5][l], VEN['cusat'], rng(l, 24, 9, 25, 9, 2024, 'and')) if l in ('fr', 'es', 'pt') else P[_k][LO.index(l)]) for l in LO)

cap("School of Earth and Environmental Sciences building at Babasaheb Bhimrao Ambedkar University, Lucknow",
 "ലഖ്‌നൗവിലെ Babasaheb Bhimrao Ambedkar University-യിലെ School of Earth and Environmental Sciences കെട്ടിടം", "लखनऊ के Babasaheb Bhimrao Ambedkar University में School of Earth and Environmental Sciences की इमारत",
 "Bâtiment de la School of Earth and Environmental Sciences de la Babasaheb Bhimrao Ambedkar University, à Lucknow", "Gebäude der School of Earth and Environmental Sciences an der Babasaheb Bhimrao Ambedkar University, Lucknow",
 "مبنى School of Earth and Environmental Sciences في Babasaheb Bhimrao Ambedkar University بمدينة لكناو", "Edificio de la School of Earth and Environmental Sciences de la Babasaheb Bhimrao Ambedkar University, en Lucknow",
 "勒克瑙 Babasaheb Bhimrao Ambedkar University 的 School of Earth and Environmental Sciences 大楼", "ラクナウの Babasaheb Bhimrao Ambedkar University にある School of Earth and Environmental Sciences の建物",
 "Prédio da School of Earth and Environmental Sciences da Babasaheb Bhimrao Ambedkar University, em Lucknow", "Byggnaden för School of Earth and Environmental Sciences vid Babasaheb Bhimrao Ambedkar University, Lucknow")
cap("Downscaling lecture slide during the workshop at BBAU Lucknow", "BBAU ലഖ്‌നൗവിലെ ശില്പശാലയ്ക്കിടെ ഡൗൺസ്കെയിലിംഗ് പ്രഭാഷണത്തിന്റെ സ്ലൈഡ്", "BBAU लखनऊ की कार्यशाला के दौरान डाउनस्केलिंग व्याख्यान की स्लाइड",
 "Diapositive de la conférence sur la réduction d'échelle (downscaling) pendant l'atelier à la BBAU de Lucknow", "Folie des Vortrags zum Downscaling während des Workshops an der BBAU Lucknow", "شريحة محاضرة عن تصغير النطاق (downscaling) خلال ورشة العمل في BBAU بلكناو",
 "Diapositiva de la conferencia sobre regionalización (downscaling) durante el taller en la BBAU de Lucknow", "在勒克瑙 BBAU 研讨会期间，降尺度讲座的幻灯片", "ラクナウの BBAU でのワークショップにおけるダウンスケーリング講義のスライド",
 "Slide da palestra sobre downscaling durante a oficina na BBAU, em Lucknow", "Bild från föreläsningen om downscaling under workshopen vid BBAU Lucknow")
cap("Lecture hall during the workshop at BBAU Lucknow", "BBAU ലഖ്‌നൗവിലെ ശില്പശാലയ്ക്കിടെ പ്രഭാഷണ ഹാൾ", "BBAU लखनऊ की कार्यशाला के दौरान व्याख्यान कक्ष", "Salle de conférence pendant l'atelier à la BBAU de Lucknow", "Hörsaal während des Workshops an der BBAU Lucknow",
 "قاعة المحاضرات خلال ورشة العمل في BBAU بلكناو", "Sala de conferencias durante el taller en la BBAU de Lucknow", "勒克瑙 BBAU 研讨会期间的报告厅", "ラクナウの BBAU でのワークショップ中の講義室", "Auditório durante a oficina na BBAU, em Lucknow", "Föreläsningssalen under workshopen vid BBAU Lucknow")
cap("Group photograph with the participants after the workshop at Doon University", "Doon University-യിലെ ശില്പശാലയ്ക്കുശേഷം പങ്കാളികളോടൊപ്പമുള്ള ഗ്രൂപ്പ് ഫോട്ടോ", "Doon University की कार्यशाला के बाद प्रतिभागियों के साथ समूह चित्र",
 "Photo de groupe avec les participants après l'atelier à la Doon University", "Gruppenfoto mit den Teilnehmenden nach dem Workshop an der Doon University", "صورة جماعية مع المشاركين بعد ورشة العمل في Doon University",
 "Fotografía de grupo con los participantes tras el taller en la Doon University", "在 Doon University 研讨会结束后与参会者的合影", "Doon University でのワークショップ終了後、参加者との集合写真", "Foto em grupo com os participantes após a oficina na Doon University", "Gruppbild med deltagarna efter workshopen vid Doon University")
cap("Lecture during the workshop at Doon University", "Doon University-യിലെ ശില്പശാലയ്ക്കിടെ പ്രഭാഷണം", "Doon University की कार्यशाला के दौरान व्याख्यान", "Exposé pendant l'atelier à la Doon University", "Vortrag während des Workshops an der Doon University", "محاضرة خلال ورشة العمل في Doon University",
 "Conferencia durante el taller en la Doon University", "Doon University 研讨会期间的讲座", "Doon University でのワークショップ中の講義", "Palestra durante a oficina na Doon University", "Föreläsning under workshopen vid Doon University")
cap("Participants in the classroom during the workshop at Doon University", "Doon University-യിലെ ശില്പശാലയ്ക്കിടെ ക്ലാസ് മുറിയിലെ പങ്കാളികൾ", "Doon University की कार्यशाला के दौरान कक्षा में प्रतिभागी", "Participants dans la salle de cours pendant l'atelier à la Doon University",
 "Teilnehmende im Seminarraum während des Workshops an der Doon University", "المشاركون في القاعة الدراسية خلال ورشة العمل في Doon University", "Participantes en el aula durante el taller en la Doon University", "Doon University 研讨会期间教室里的参会者", "Doon University でのワークショップ中、教室にいる参加者",
 "Participantes na sala de aula durante a oficina na Doon University", "Deltagare i klassrummet under workshopen vid Doon University")
cap("Blackboard announcing the lecture series on climate change at Kannur University", "Kannur University-യിലെ കാലാവസ്ഥാ വ്യതിയാന പ്രഭാഷണ പരമ്പര അറിയിക്കുന്ന ബ്ലാക്ക്ബോർഡ്", "Kannur University में जलवायु परिवर्तन पर व्याख्यान श्रृंखला की सूचना देता ब्लैकबोर्ड",
 "Tableau noir annonçant la série de conférences sur le changement climatique à la Kannur University", "Tafel mit der Ankündigung der Vortragsreihe zum Klimawandel an der Kannur University", "سبورة تعلن عن سلسلة المحاضرات حول تغيّر المناخ في Kannur University",
 "Pizarra que anuncia el ciclo de conferencias sobre el cambio climático en la Kannur University", "Kannur University 气候变化系列讲座的黑板通知", "Kannur University の気候変動に関する連続講義を告知する黒板", "Quadro-negro anunciando a série de palestras sobre mudanças climáticas na Kannur University", "Griffeltavla som annonserar föreläsningsserien om klimatförändringar vid Kannur University")
cap("Classroom during the lecture series at Kannur University", "Kannur University-യിലെ പ്രഭാഷണ പരമ്പരയ്ക്കിടെ ക്ലാസ് മുറി", "Kannur University की व्याख्यान श्रृंखला के दौरान कक्षा", "Salle de cours pendant la série de conférences à la Kannur University", "Seminarraum während der Vortragsreihe an der Kannur University",
 "القاعة الدراسية خلال سلسلة المحاضرات في Kannur University", "Aula durante el ciclo de conferencias en la Kannur University", "Kannur University 系列讲座期间的教室", "Kannur University での連続講義中の教室", "Sala de aula durante a série de palestras na Kannur University", "Klassrummet under föreläsningsserien vid Kannur University")
cap("Lecture during the series at Kannur University", "Kannur University-യിലെ പരമ്പരയ്ക്കിടെ പ്രഭാഷണം", "Kannur University की श्रृंखला के दौरान व्याख्यान", "Conférence pendant la série à la Kannur University", "Vortrag während der Reihe an der Kannur University", "محاضرة خلال السلسلة في Kannur University",
 "Conferencia durante el ciclo en la Kannur University", "Kannur University 系列讲座中的一场讲座", "Kannur University での連続講義の一場面", "Palestra durante a série na Kannur University", "Föreläsning under serien vid Kannur University")
cap("Lecture hall during the Python Essentials workshop at CUSAT", "CUSAT-ലെ Python അടിസ്ഥാന ശില്പശാലയ്ക്കിടെ പ്രഭാഷണ ഹാൾ", "CUSAT की Python की अनिवार्य बातें कार्यशाला के दौरान व्याख्यान कक्ष", "Salle de conférence pendant l'atelier « Les essentiels de Python » au CUSAT",
 "Hörsaal während des Workshops „Python-Grundlagen“ am CUSAT", "قاعة المحاضرات خلال ورشة «أساسيات Python» في CUSAT", "Sala de conferencias durante el taller «Fundamentos de Python» en el CUSAT", "CUSAT “Python 基础”研讨会期间的报告厅", "CUSAT での「Python の基本」ワークショップ中の講義室",
 "Auditório durante a oficina «Fundamentos de Python» na CUSAT", "Föreläsningssalen under workshopen Python i grunden vid CUSAT")
cap("Presenting during the Python Essentials workshop at CUSAT", "CUSAT-ലെ Python അടിസ്ഥാന ശില്പശാലയ്ക്കിടെ അവതരണം", "CUSAT की Python की अनिवार्य बातें कार्यशाला के दौरान प्रस्तुति", "Présentation pendant l'atelier « Les essentiels de Python » au CUSAT",
 "Präsentation während des Workshops „Python-Grundlagen“ am CUSAT", "أقدّم عرضًا خلال ورشة «أساسيات Python» في CUSAT", "Presentación durante el taller «Fundamentos de Python» en el CUSAT", "在 CUSAT “Python 基础”研讨会上作报告", "CUSAT での「Python の基本」ワークショップで発表している様子",
 "Apresentação durante a oficina «Fundamentos de Python» na CUSAT", "Jag presenterar under workshopen Python i grunden vid CUSAT")
cap("Stage and lectern during the Python Essentials workshop at CUSAT", "CUSAT-ലെ Python അടിസ്ഥാന ശില്പശാലയ്ക്കിടെ വേദിയും പ്രസംഗപീഠവും", "CUSAT की Python की अनिवार्य बातें कार्यशाला के दौरान मंच और व्याख्यान-मंच", "Scène et pupitre pendant l'atelier « Les essentiels de Python » au CUSAT",
 "Bühne und Rednerpult während des Workshops „Python-Grundlagen“ am CUSAT", "المنصة والمنبر خلال ورشة «أساسيات Python» في CUSAT", "Escenario y atril durante el taller «Fundamentos de Python» en el CUSAT", "CUSAT “Python 基础”研讨会期间的舞台和讲台", "CUSAT での「Python の基本」ワークショップ中の舞台と演台",
 "Palco e púlpito durante a oficina «Fundamentos de Python» na CUSAT", "Scen och talarstol under workshopen Python i grunden vid CUSAT")
cap("Opening session of the Technical Workshop on Earthquake Early Warning System at IIT Roorkee", "IIT Roorkee-ലെ ഭൂകമ്പ മുന്നറിയിപ്പ് സംവിധാനത്തെക്കുറിച്ചുള്ള സാങ്കേതിക ശില്പശാലയുടെ ഉദ്ഘാടന സെഷൻ", "IIT Roorkee में भूकंप पूर्व चेतावनी प्रणाली पर तकनीकी कार्यशाला का उद्घाटन सत्र",
 "Séance d'ouverture de l'atelier technique sur le système d'alerte précoce aux séismes à l'IIT Roorkee", "Eröffnungssitzung des Technischen Workshops zum Erdbebenfrühwarnsystem am IIT Roorkee", "الجلسة الافتتاحية لورشة العمل الفنية حول نظام الإنذار المبكر بالزلازل في IIT Roorkee",
 "Sesión inaugural del taller técnico sobre el sistema de alerta temprana de terremotos en el IIT Roorkee", "IIT Roorkee 地震预警系统技术研讨会开幕式", "IIT Roorkee での地震早期警戒システムに関する技術ワークショップの開会セッション", "Sessão de abertura da oficina técnica sobre o sistema de alerta precoce de terremotos no IIT Roorkee", "Inledande session i den tekniska workshopen om system för tidig jordbävningsvarning vid IIT Roorkee")
cap("Lecture during the Technical Workshop on Earthquake Early Warning System at IIT Roorkee", "IIT Roorkee-ലെ ഭൂകമ്പ മുന്നറിയിപ്പ് സംവിധാനത്തെക്കുറിച്ചുള്ള സാങ്കേതിക ശില്പശാലയ്ക്കിടെ പ്രഭാഷണം", "IIT Roorkee में भूकंप पूर्व चेतावनी प्रणाली पर तकनीकी कार्यशाला के दौरान व्याख्यान",
 "Exposé pendant l'atelier technique sur le système d'alerte précoce aux séismes à l'IIT Roorkee", "Vortrag während des Technischen Workshops zum Erdbebenfrühwarnsystem am IIT Roorkee", "محاضرة خلال ورشة العمل الفنية حول نظام الإنذار المبكر بالزلازل في IIT Roorkee",
 "Conferencia durante el taller técnico sobre el sistema de alerta temprana de terremotos en el IIT Roorkee", "IIT Roorkee 地震预警系统技术研讨会期间的讲座", "IIT Roorkee での地震早期警戒システムに関する技術ワークショップ中の講義", "Palestra durante a oficina técnica sobre o sistema de alerta precoce de terremotos no IIT Roorkee", "Föreläsning under den tekniska workshopen om system för tidig jordbävningsvarning vid IIT Roorkee")

cap("IIT Roorkee on the eve of the 80th Independence Day.", "80-ാമത് സ്വാതന്ത്ര്യദിനത്തിന്റെ തലേന്ന് IIT Roorkee.", "80वें स्वतंत्रता दिवस की पूर्व संध्या पर IIT Roorkee।", "L'IIT Roorkee à la veille du 80e jour de l'Indépendance.", "Das IIT Roorkee am Vorabend des 80. Unabhängigkeitstags.",
 "IIT Roorkee عشية الذكرى الثمانين لعيد الاستقلال.", "El IIT Roorkee en vísperas del 80.º Día de la Independencia.", "IIT Roorkee 在第 80 个独立日前夕。", "第80回独立記念日の前夜の IIT Roorkee。", "O IIT Roorkee na véspera do 80.º Dia da Independência.", "IIT Roorkee dagen före den 80:e självständighetsdagen.")
cap("Entrance of the CNRS campus in Montpellier.", "മോംപെലിയറിലെ CNRS ക്യാമ്പസിന്റെ പ്രവേശന കവാടം.", "मोंपेलिए में CNRS परिसर का प्रवेश द्वार।", "Entrée du campus du CNRS à Montpellier.", "Eingang zum CNRS-Campus in Montpellier.", "مدخل حرم CNRS في مونبلييه.", "Entrada del campus del CNRS en Montpellier.", "蒙彼利埃 CNRS 校区入口。", "モンペリエの CNRS キャンパスの入口。", "Entrada do campus do CNRS em Montpellier.", "Ingången till CNRS-campus i Montpellier.")
cap("Montpellier, France: my host institute CEFE-CNRS during the Raman-Charpak Fellowship (31 July to 31 December 2025), and the University of Montpellier campus nearby.",
 f"ഫ്രാൻസിലെ മോംപെലിയർ: Raman-Charpak ഫെലോഷിപ്പ് കാലത്തെ ({rng('ml',31,7,31,12,2025)}) എന്റെ ആതിഥേയ സ്ഥാപനമായ CEFE-CNRS-ഉം സമീപത്തെ University of Montpellier ക്യാമ്പസും.",
 f"मोंपेलिए, फ़्रांस: Raman-Charpak फ़ेलोशिप ({rng('hi',31,7,31,12,2025)}) के दौरान मेरा मेज़बान संस्थान CEFE-CNRS और पास का University of Montpellier परिसर।",
 f"Montpellier, France : mon institut d'accueil, le CEFE-CNRS, pendant la bourse Raman-Charpak ({rng('fr',31,7,31,12,2025)}), et le campus voisin de l'Université de Montpellier.",
 f"Montpellier, Frankreich: mein Gastinstitut CEFE-CNRS während des Raman-Charpak-Stipendiums ({rng('de',31,7,31,12,2025)}) und der nahe gelegene Campus der Universität Montpellier.",
 f"مونبلييه، فرنسا: معهدي المضيف CEFE-CNRS خلال زمالة Raman-Charpak ({rng('ar',31,7,31,12,2025)})، وحرم جامعة مونبلييه القريب.",
 f"Montpellier, Francia: mi instituto de acogida, el CEFE-CNRS, durante la beca Raman-Charpak ({rng('es',31,7,31,12,2025)}), y el campus cercano de la Universidad de Montpellier.",
 f"法国蒙彼利埃：Raman-Charpak 奖学金期间（{rng('zh',31,7,31,12,2025)}）我的接收机构 CEFE-CNRS，以及附近的蒙彼利埃大学校区。",
 f"フランス・モンペリエ：Raman-Charpak フェローシップ期間（{rng('ja',31,7,31,12,2025)}）の受け入れ機関 CEFE-CNRS と、近くのモンペリエ大学キャンパス。",
 f"Montpellier, França: meu instituto anfitrião, o CEFE-CNRS, durante a bolsa Raman-Charpak ({rng('pt',31,7,31,12,2025)}), e o campus vizinho da Universidade de Montpellier.",
 f"Montpellier, Frankrike: mitt värdinstitut CEFE-CNRS under Raman-Charpak-stipendiet ({rng('sv',31,7,31,12,2025)}) och universitetet i Montpelliers campus i närheten.")
cap("WCRG workspace at CoEDMM, IIT Roorkee.", "CoEDMM, IIT Roorkee-ലെ WCRG വർക്ക്‌സ്‌പെയ്‌സ്.", "CoEDMM, IIT Roorkee में WCRG का कार्यस्थल।", "Espace de travail du WCRG au CoEDMM, IIT Roorkee.", "WCRG-Arbeitsbereich am CoEDMM, IIT Roorkee.", "مساحة عمل WCRG في CoEDMM، IIT Roorkee.", "Espacio de trabajo del WCRG en el CoEDMM, IIT Roorkee.", "CoEDMM, IIT Roorkee 的 WCRG 工作区。", "CoEDMM, IIT Roorkee にある WCRG の作業スペース。", "Espaço de trabalho do WCRG no CoEDMM, IIT Roorkee.", "WCRG:s arbetsutrymme vid CoEDMM, IIT Roorkee.")
cap("Onam 2026 at IIT Roorkee, on the Sunday after the Fit India Cyclothon.", "Fit India Cyclothon-ന് ശേഷമുള്ള ഞായറാഴ്ച IIT Roorkee-ൽ ഓണം 2026.", "Fit India Cyclothon के बाद वाले रविवार को IIT Roorkee में ओणम 2026।", "Onam 2026 à l'IIT Roorkee, le dimanche suivant le Fit India Cyclothon.", "Onam 2026 am IIT Roorkee, am Sonntag nach dem Fit India Cyclothon.",
 "أونام 2026 في IIT Roorkee، يوم الأحد التالي لسباق Fit India Cyclothon.", "Onam 2026 en el IIT Roorkee, el domingo posterior al Fit India Cyclothon.", "2026 年 Onam 节在 IIT Roorkee，时间是 Fit India Cyclothon 后的那个周日。", "Fit India Cyclothon の翌週の日曜日に IIT Roorkee で祝ったオーナム2026。", "Onam 2026 no IIT Roorkee, no domingo seguinte ao Fit India Cyclothon.", "Onam 2026 vid IIT Roorkee, söndagen efter Fit India Cyclothon.")
cap("Onam 2025 in Montpellier, France: a Kerala breakfast and a festive lunch.", "ഫ്രാൻസിലെ മോംപെലിയറിൽ ഓണം 2025: കേരള പ്രഭാതഭക്ഷണവും ഉത്സവ സദ്യയും.", "मोंपेलिए, फ़्रांस में ओणम 2025: केरल का नाश्ता और उत्सव का भोजन।", "Onam 2025 à Montpellier, en France : un petit-déjeuner du Kerala et un déjeuner de fête.", "Onam 2025 in Montpellier, Frankreich: ein Frühstück aus Kerala und ein festliches Mittagessen.",
 "أونام 2025 في مونبلييه بفرنسا: إفطار من كيرالا وغداء احتفالي.", "Onam 2025 en Montpellier, Francia: un desayuno de Kerala y una comida festiva.", "2025 年 Onam 节在法国蒙彼利埃：喀拉拉风味早餐和节日午餐。", "フランス・モンペリエでのオーナム2025：ケーララ風の朝食とお祝いの昼食。", "Onam 2025 em Montpellier, na França: um café da manhã de Kerala e um almoço festivo.", "Onam 2025 i Montpellier, Frankrike: en frukost från Kerala och en festlunch.")
cap("Group dinner at Balu's home.", "ബാലുവിന്റെ വീട്ടിൽ കൂട്ടായ അത്താഴം.", "बालू के घर पर सामूहिक रात्रिभोज।", "Dîner de groupe chez Balu.", "Gemeinsames Abendessen bei Balu zu Hause.", "عشاء جماعي في منزل بالو.", "Cena de grupo en casa de Balu.", "在 Balu 家的聚餐。", "Balu の自宅でのグループディナー。", "Jantar em grupo na casa do Balu.", "Middag med gruppen hemma hos Balu.")
cap("A rainy evening at IIT Roorkee.", "IIT Roorkee-ലെ ഒരു മഴക്കാല സായാഹ്നം.", "IIT Roorkee में एक बरसाती शाम।", "Une soirée pluvieuse à l'IIT Roorkee.", "Ein regnerischer Abend am IIT Roorkee.", "مساء ممطر في IIT Roorkee.", "Una tarde lluviosa en el IIT Roorkee.", "IIT Roorkee 的一个雨夜。", "IIT Roorkee の雨の夕方。", "Uma noite chuvosa no IIT Roorkee.", "En regnig kväll vid IIT Roorkee.")
cap("Fit India Cyclothon 2026 at IIT Roorkee, a 50 km ride from the Main Campus to the Saharanpur Campus, with friends and colleagues from IIT Roorkee.",
 "IIT Roorkee-ലെ Fit India Cyclothon 2026: മെയിൻ ക്യാമ്പസിൽ നിന്ന് സഹാറൻപൂർ ക്യാമ്പസിലേക്ക് 50 കിലോമീറ്റർ സൈക്കിൾ യാത്ര, IIT Roorkee-ലെ സുഹൃത്തുക്കൾക്കും സഹപ്രവർത്തകർക്കും ഒപ്പം.", "IIT Roorkee में Fit India Cyclothon 2026: IIT Roorkee के मित्रों और सहकर्मियों के साथ मुख्य परिसर से सहारनपुर परिसर तक 50 किमी की साइकिल यात्रा।",
 "Fit India Cyclothon 2026 à l'IIT Roorkee : 50 km à vélo entre le campus principal et le campus de Saharanpur, avec des amis et des collègues de l'IIT Roorkee.", "Fit India Cyclothon 2026 am IIT Roorkee: eine 50 km lange Radtour vom Hauptcampus zum Campus Saharanpur, gemeinsam mit Freunden und Kollegen vom IIT Roorkee.",
 "Fit India Cyclothon 2026 في IIT Roorkee: رحلة بالدراجة مسافتها 50 كم من الحرم الرئيسي إلى حرم سهارنبور مع أصدقاء وزملاء من IIT Roorkee.", "Fit India Cyclothon 2026 en el IIT Roorkee: un recorrido en bicicleta de 50 km desde el campus principal hasta el campus de Saharanpur, con amigos y colegas del IIT Roorkee.",
 "IIT Roorkee 的 Fit India Cyclothon 2026：与 IIT Roorkee 的朋友和同事一起，从主校区骑行 50 公里到萨哈兰普尔校区。", "IIT Roorkee での Fit India Cyclothon 2026：IIT Roorkee の友人や同僚とともに、メインキャンパスからサハーランプル・キャンパスまでの50 kmを自転車で走りました。",
 "Fit India Cyclothon 2026 no IIT Roorkee: um percurso de 50 km de bicicleta do campus principal ao campus de Saharanpur, com amigos e colegas do IIT Roorkee.", "Fit India Cyclothon 2026 vid IIT Roorkee: en 50 km lång cykeltur från huvudcampus till Saharanpur-campus, tillsammans med vänner och kollegor från IIT Roorkee.")
cap("Holi 2026 at IIT Roorkee, a day of colours with friends and colleagues on the campus.", "IIT Roorkee-ലെ ഹോളി 2026: ക്യാമ്പസിൽ സുഹൃത്തുക്കൾക്കും സഹപ്രവർത്തകർക്കും ഒപ്പം ഒരു വർണ്ണദിനം.", "IIT Roorkee में होली 2026: परिसर में मित्रों और सहकर्मियों के साथ रंगों का एक दिन।",
 "Holi 2026 à l'IIT Roorkee : une journée de couleurs avec des amis et des collègues sur le campus.", "Holi 2026 am IIT Roorkee: ein Tag voller Farben mit Freunden und Kollegen auf dem Campus.", "هولي 2026 في IIT Roorkee: يوم من الألوان مع الأصدقاء والزملاء في الحرم الجامعي.",
 "Holi 2026 en el IIT Roorkee: un día de colores con amigos y colegas en el campus.", "2026 年 Holi 节在 IIT Roorkee：与朋友和同事在校园里度过的缤纷一天。", "IIT Roorkee でのホーリー2026：キャンパスで友人や同僚と過ごした色彩の一日。", "Holi 2026 no IIT Roorkee: um dia de cores com amigos e colegas no campus.", "Holi 2026 vid IIT Roorkee: en färgsprakande dag med vänner och kollegor på campus.")
cap("The Mediterranean Sea on a scorching summer day.", "കത്തുന്ന വേനൽ ദിനത്തിൽ മെഡിറ്ററേനിയൻ കടൽ.", "झुलसाती गर्मी के दिन भूमध्य सागर।", "La mer Méditerranée par une journée d'été torride.", "Das Mittelmeer an einem glühend heißen Sommertag.", "البحر المتوسط في يوم صيفي شديد الحرارة.", "El mar Mediterráneo en un día de verano abrasador.", "酷暑夏日里的地中海。", "うだるように暑い夏の日の地中海。", "O Mar Mediterrâneo em um dia escaldante de verão.", "Medelhavet en stekhet sommardag.")
cap("Trip to Marseille, France: a trek through the limestone hills to the Calanques.", "ഫ്രാൻസിലെ മാർസെയ്‌യിലേക്കുള്ള യാത്ര: ചുണ്ണാമ്പുകല്ല് കുന്നുകളിലൂടെ കാലാങ്ക്സിലേക്കുള്ള ട്രെക്കിംഗ്.", "फ़्रांस के मार्सिले की यात्रा: चूना पत्थर की पहाड़ियों से होकर कालांक तक पैदल यात्रा।",
 "Excursion à Marseille, en France : une randonnée à travers les collines calcaires jusqu'aux Calanques.", "Ausflug nach Marseille, Frankreich: eine Wanderung durch die Kalksteinhügel zu den Calanques.", "رحلة إلى مرسيليا بفرنسا: مسير عبر التلال الكلسية إلى الكالانك.",
 "Viaje a Marsella, Francia: una caminata por las colinas calizas hasta las calas (Calanques).", "法国马赛之行：徒步穿越石灰岩山丘，前往卡朗格峡湾（Calanques）。", "フランス・マルセイユへの旅：石灰岩の丘を越えてカランク（Calanques）まで歩きました。", "Viagem a Marselha, na França: uma caminhada pelas colinas calcárias até as Calanques.", "Resa till Marseille, Frankrike: en vandring genom kalkstensbergen till Calanques.")
cap("Montpellier historical monuments: the Promenade du Peyrou and its Arc de Triomphe (Porte du Peyrou), the Palais de Justice, and Carré Sainte-Anne.",
 "മോംപെലിയറിലെ ചരിത്രസ്മാരകങ്ങൾ: Promenade du Peyrou-യും അതിലെ Arc de Triomphe-ഉം (Porte du Peyrou), Palais de Justice, Carré Sainte-Anne.", "मोंपेलिए के ऐतिहासिक स्मारक: Promenade du Peyrou और उसका Arc de Triomphe (Porte du Peyrou), Palais de Justice और Carré Sainte-Anne।",
 "Monuments historiques de Montpellier : la promenade du Peyrou et son arc de triomphe (porte du Peyrou), le palais de justice et le Carré Sainte-Anne.", "Historische Bauwerke in Montpellier: die Promenade du Peyrou mit ihrem Triumphbogen (Porte du Peyrou), der Justizpalast (Palais de Justice) und das Carré Sainte-Anne.",
 "معالم مونبلييه التاريخية: متنزه Promenade du Peyrou وقوس النصر فيه (Porte du Peyrou)، وقصر العدل (Palais de Justice)، وCarré Sainte-Anne.", "Monumentos históricos de Montpellier: el paseo du Peyrou y su arco del triunfo (Porte du Peyrou), el Palacio de Justicia (Palais de Justice) y el Carré Sainte-Anne.",
 "蒙彼利埃的历史建筑：佩鲁散步广场（Promenade du Peyrou）及其凯旋门（Porte du Peyrou）、司法宫（Palais de Justice）和圣安妮广场（Carré Sainte-Anne）。", "モンペリエの歴史的建造物：ペイルー遊歩道（Promenade du Peyrou）とその凱旋門（Porte du Peyrou）、裁判所（Palais de Justice）、カレ・サンタンヌ（Carré Sainte-Anne）。",
 "Monumentos históricos de Montpellier: a Promenade du Peyrou e seu Arco do Triunfo (Porte du Peyrou), o Palácio da Justiça (Palais de Justice) e o Carré Sainte-Anne.", "Montpelliers historiska monument: Promenade du Peyrou med sin triumfbåge (Porte du Peyrou), rättspalatset (Palais de Justice) och Carré Sainte-Anne.")
cap("Montpellier vibes: the view from my apartment balcony in the evening, in the Mediterranean summer.", "മോംപെലിയർ അനുഭവം: മെഡിറ്ററേനിയൻ വേനലിൽ സായാഹ്നത്തിൽ എന്റെ അപ്പാർട്ട്മെന്റ് ബാൽക്കണിയിൽ നിന്നുള്ള കാഴ്ച.", "मोंपेलिए का माहौल: भूमध्यसागरीय गर्मियों में शाम को मेरे अपार्टमेंट की बालकनी से दृश्य।",
 "L'ambiance de Montpellier : la vue depuis le balcon de mon appartement en soirée, en plein été méditerranéen.", "Montpellier-Stimmung: der abendliche Blick von meinem Wohnungsbalkon im mediterranen Sommer.", "أجواء مونبلييه: المنظر من شرفة شقتي في المساء خلال الصيف المتوسطي.",
 "El ambiente de Montpellier: la vista desde el balcón de mi apartamento al atardecer, en pleno verano mediterráneo.", "蒙彼利埃的氛围：地中海夏日傍晚，从我公寓阳台望出去的景色。", "モンペリエの雰囲気：地中海の夏の夕方、アパートのバルコニーからの眺め。", "O clima de Montpellier: a vista da varanda do meu apartamento no fim do dia, em pleno verão mediterrâneo.", "Montpellierstämning: kvällsutsikten från min lägenhets balkong under den mediterrana sommaren.")
cap("My self-cooking diary in France: Kerala puttu and egg curry, and French toast.", "ഫ്രാൻസിലെ എന്റെ സ്വയം പാചക ഡയറി: കേരള പുട്ടും മുട്ടക്കറിയും, ഫ്രഞ്ച് ടോസ്റ്റും.", "फ़्रांस में मेरी खुद पकाने की डायरी: केरल का पुट्टू और अंडा करी, और फ़्रेंच टोस्ट।",
 "Mon carnet de cuisine maison en France : puttu du Kerala et curry d'œufs, et pain perdu.", "Mein Selbstkoch-Tagebuch aus Frankreich: Puttu aus Kerala mit Eiercurry und French Toast.", "يوميات الطبخ الذاتي في فرنسا: بوتو من كيرالا مع كاري البيض، وتوست فرنسي.",
 "Mi diario de cocina propia en Francia: puttu de Kerala con curry de huevo, y tostadas francesas.", "我在法国的自己下厨日记：喀拉拉 puttu 配鸡蛋咖喱，以及法式吐司。", "フランスでの自炊日記：ケーララのプットゥと卵カレー、そしてフレンチトースト。", "Meu diário de cozinha caseira na França: puttu de Kerala com curry de ovos e rabanada.", "Min matlagningsdagbok från Frankrike: puttu från Kerala med äggcurry, och fattiga riddare.")
cap("Trip to Nîmes, in southern France, starting with breakfast: an americano with a palmier and a croissant.", "തെക്കൻ ഫ്രാൻസിലെ നീംസിലേക്കുള്ള യാത്ര, പ്രഭാതഭക്ഷണത്തോടെ തുടക്കം: ഒരു അമേരിക്കാനോയും പാൽമിയറും ക്രോസന്റും.", "दक्षिणी फ़्रांस के नीम की यात्रा, नाश्ते से शुरुआत: अमेरिकानो के साथ पाल्मिये और क्रोसां।",
 "Excursion à Nîmes, dans le sud de la France, qui commence par le petit-déjeuner : un americano avec un palmier et un croissant.", "Ausflug nach Nîmes in Südfrankreich, beginnend mit dem Frühstück: ein Americano mit einem Palmier und einem Croissant.", "رحلة إلى نيم في جنوب فرنسا، بدأت بالفطور: قهوة أمريكانو مع بالميه وكرواسون.",
 "Viaje a Nîmes, en el sur de Francia, que empezó con el desayuno: un americano con un palmier y un cruasán.", "法国南部尼姆之行，从早餐开始：一杯美式咖啡配蝴蝶酥和羊角面包。", "南フランスのニームへの旅は朝食から：アメリカーノにパルミエとクロワッサンを添えて。", "Viagem a Nîmes, no sul da França, começando pelo café da manhã: um americano com um palmier e um croissant.", "Resa till Nîmes i södra Frankrike, som började med frukost: en americano med en palmier och en croissant.")
cap("IIT Roorkee on a fine evening", "ഒരു സുന്ദര സായാഹ്നത്തിൽ IIT Roorkee", "एक सुहानी शाम में IIT Roorkee", "L'IIT Roorkee par une belle soirée", "Das IIT Roorkee an einem schönen Abend", "IIT Roorkee في مساء جميل", "El IIT Roorkee en una hermosa tarde", "傍晚时分的 IIT Roorkee", "穏やかな夕方の IIT Roorkee", "O IIT Roorkee em uma bela noite", "IIT Roorkee en vacker kväll")
cap("Montpellier, views near the CNRS campus, close to the Parc Zoologique de Lunaret (Lunaret Zoo) and Vert Bois.", "മോംപെലിയർ, CNRS ക്യാമ്പസിന് സമീപമുള്ള കാഴ്ചകൾ, Parc Zoologique de Lunaret (ലുനാരെ മൃഗശാല), Vert Bois എന്നിവയ്ക്ക് അടുത്ത്.", "मोंपेलिए, CNRS परिसर के पास के दृश्य, Parc Zoologique de Lunaret (लुनारे चिड़ियाघर) और Vert Bois के समीप।",
 "Montpellier, vues près du campus du CNRS, à proximité du Parc zoologique de Lunaret et de Vert Bois.", "Montpellier, Ansichten in der Nähe des CNRS-Campus, nahe dem Parc Zoologique de Lunaret (Zoo Lunaret) und Vert Bois.", "مونبلييه، مناظر قرب حرم CNRS، بالقرب من حديقة الحيوان Parc Zoologique de Lunaret (حديقة لونار) ومنطقة Vert Bois.",
 "Montpellier, vistas cerca del campus del CNRS, junto al Parc Zoologique de Lunaret (zoo de Lunaret) y Vert Bois.", "蒙彼利埃，CNRS 校区附近的景色，靠近吕纳雷动物园（Parc Zoologique de Lunaret）和 Vert Bois。", "モンペリエ、CNRS キャンパス近くの風景。リュナレ動物園（Parc Zoologique de Lunaret）と Vert Bois の近くです。",
 "Montpellier, vistas perto do campus do CNRS, próximo ao Parc Zoologique de Lunaret (zoológico de Lunaret) e a Vert Bois.", "Montpellier, vyer nära CNRS-campus, nära Parc Zoologique de Lunaret (Lunarets djurpark) och Vert Bois.")
cap("Heart of Montpellier, France: Place de la Comédie, the cathedral and the Saint-Éloi district.", "ഫ്രാൻസിലെ മോംപെലിയറിന്റെ ഹൃദയഭാഗം: Place de la Comédie, കത്തീഡ്രൽ, Saint-Éloi ജില്ല.", "मोंपेलिए, फ़्रांस का हृदय: Place de la Comédie, कैथेड्रल और Saint-Éloi जिला।",
 "Au cœur de Montpellier, en France : la place de la Comédie, la cathédrale et le quartier Saint-Éloi.", "Das Herz von Montpellier, Frankreich: die Place de la Comédie, die Kathedrale und das Viertel Saint-Éloi.", "قلب مونبلييه بفرنسا: ساحة Place de la Comédie والكاتدرائية وحي Saint-Éloi.",
 "El corazón de Montpellier, Francia: la Place de la Comédie, la catedral y el barrio de Saint-Éloi.", "法国蒙彼利埃市中心：喜剧广场（Place de la Comédie）、大教堂和圣埃卢瓦（Saint-Éloi）街区。", "フランス・モンペリエの中心部：コメディ広場（Place de la Comédie）、大聖堂、サン・エロワ（Saint-Éloi）地区。",
 "O coração de Montpellier, na França: a Place de la Comédie, a catedral e o bairro de Saint-Éloi.", "Montpelliers hjärta i Frankrike: Place de la Comédie, katedralen och stadsdelen Saint-Éloi.")
cap("Lunch at the CNRS campus restaurant in Montpellier, open to CNRS employees from July to December 2025.", "മോംപെലിയറിലെ CNRS ക്യാമ്പസ് റെസ്റ്റോറന്റിലെ ഉച്ചഭക്ഷണം; 2025 ജൂലൈ മുതൽ ഡിസംബർ വരെ CNRS ജീവനക്കാർക്ക് പ്രവേശനമുണ്ടായിരുന്നു.", "मोंपेलिए में CNRS परिसर के रेस्तरां में दोपहर का भोजन, जो जुलाई से दिसंबर 2025 तक CNRS कर्मचारियों के लिए खुला था।",
 "Déjeuner au restaurant du campus du CNRS à Montpellier, ouvert aux employés du CNRS de juillet à décembre 2025.", "Mittagessen im Restaurant des CNRS-Campus in Montpellier, von Juli bis Dezember 2025 für CNRS-Beschäftigte geöffnet.", "غداء في مطعم حرم CNRS بمونبلييه، المتاح لموظفي CNRS من يوليو إلى ديسمبر 2025.",
 "Almuerzo en el restaurante del campus del CNRS en Montpellier, abierto a los empleados del CNRS de julio a diciembre de 2025.", "在蒙彼利埃 CNRS 校区餐厅用午餐，2025 年 7 月至 12 月向 CNRS 员工开放。", "モンペリエの CNRS キャンパスのレストランでの昼食。2025年7月から12月まで CNRS の職員に開放されていました。",
 "Almoço no restaurante do campus do CNRS em Montpellier, aberto aos funcionários do CNRS de julho a dezembro de 2025.", "Lunch på CNRS-campus restaurang i Montpellier, öppen för CNRS-anställda från juli till december 2025.")
cap("Fit India Half Marathon 2024 (Sangram 2024) at IIT Roorkee, 21 km, with my completion medal and a few nature photos from the route.", "IIT Roorkee-ലെ Fit India Half Marathon 2024 (Sangram 2024), 21 കിലോമീറ്റർ; പൂർത്തീകരണ മെഡലും വഴിയിൽ നിന്നുള്ള ചില പ്രകൃതി ചിത്രങ്ങളും.",
 "IIT Roorkee में Fit India Half Marathon 2024 (Sangram 2024), 21 किमी; मेरा पूर्णता पदक और मार्ग की कुछ प्रकृति तस्वीरें।", "Fit India Half Marathon 2024 (Sangram 2024) à l'IIT Roorkee, 21 km, avec ma médaille de finisher et quelques photos de nature prises sur le parcours.",
 "Fit India Half Marathon 2024 (Sangram 2024) am IIT Roorkee, 21 km, mit meiner Finisher-Medaille und einigen Naturfotos von der Strecke.", "Fit India Half Marathon 2024 (Sangram 2024) في IIT Roorkee، 21 كم، مع ميدالية إتمام السباق وبعض صور الطبيعة من المسار.",
 "Fit India Half Marathon 2024 (Sangram 2024) en el IIT Roorkee, 21 km, con mi medalla de finalista y algunas fotos de naturaleza del recorrido.", "IIT Roorkee 的 Fit India Half Marathon 2024（Sangram 2024），21 公里，附我的完赛奖牌和沿途的几张自然风光照片。",
 "IIT Roorkee での Fit India Half Marathon 2024（Sangram 2024）、21 km。完走メダルと、コース沿いの自然の写真をいくつか。", "Fit India Half Marathon 2024 (Sangram 2024) no IIT Roorkee, 21 km, com minha medalha de conclusão e algumas fotos da natureza ao longo do percurso.",
 "Fit India Half Marathon 2024 (Sangram 2024) vid IIT Roorkee, 21 km, med min målgångsmedalj och några naturbilder från banan.")
cap("Strasbourg, France: the railway station, the cathedral, the rooftops, and the evening and sunset skies.", "ഫ്രാൻസിലെ സ്ട്രാസ്ബർഗ്: റെയിൽവേ സ്റ്റേഷൻ, കത്തീഡ്രൽ, മേൽക്കൂരകൾ, സായാഹ്ന-അസ്തമയ ആകാശങ്ങൾ.", "स्ट्रासबर्ग, फ़्रांस: रेलवे स्टेशन, कैथेड्रल, छतें और शाम तथा सूर्यास्त का आकाश।",
 "Strasbourg, en France : la gare, la cathédrale, les toits, et le ciel du soir et du coucher de soleil.", "Straßburg, Frankreich: der Bahnhof, das Münster, die Dächer sowie der Abend- und Sonnenunterganghimmel.", "ستراسبورغ بفرنسا: محطة القطار والكاتدرائية والأسطح وسماء المساء والغروب.",
 "Estrasburgo, Francia: la estación de tren, la catedral, los tejados y los cielos del atardecer.", "法国斯特拉斯堡：火车站、大教堂、屋顶，以及傍晚和日落时分的天空。", "フランス・ストラスブール：駅、大聖堂、屋根、そして夕暮れと日没の空。", "Estrasburgo, na França: a estação de trem, a catedral, os telhados e os céus do entardecer e do pôr do sol.", "Strasbourg i Frankrike: järnvägsstationen, katedralen, hustaken samt kvälls- och solnedgångshimlen.")
cap("Trip to Harsil and Gangotri, Uttarakhand, on 1 and 2 March 2024, with my colleagues Shiwam Singh, Anamika Sekar, Shivani Joshi and Saurabh Singh.",
 f"ഉത്തരാഖണ്ഡിലെ ഹർസിൽ, ഗംഗോത്രി എന്നിവിടങ്ങളിലേക്കുള്ള യാത്ര ({rng('ml',1,3,2,3,2024,'and')}), സഹപ്രവർത്തകരായ Shiwam Singh, Anamika Sekar, Shivani Joshi, Saurabh Singh എന്നിവർക്കൊപ്പം.",
 f"उत्तराखंड के हर्षिल और गंगोत्री की यात्रा ({rng('hi',1,3,2,3,2024,'and')}), सहकर्मियों Shiwam Singh, Anamika Sekar, Shivani Joshi और Saurabh Singh के साथ।",
 f"Excursion à Harsil et à Gangotri, dans l'Uttarakhand ({rng('fr',1,3,2,3,2024,'and')}), avec mes collègues Shiwam Singh, Anamika Sekar, Shivani Joshi et Saurabh Singh.",
 f"Ausflug nach Harsil und Gangotri in Uttarakhand ({rng('de',1,3,2,3,2024,'and')}) mit meinen Kollegen Shiwam Singh, Anamika Sekar, Shivani Joshi und Saurabh Singh.",
 f"رحلة إلى هارسيل وغانغوتري في أوتاراخاند ({rng('ar',1,3,2,3,2024,'and')}) مع زملائي Shiwam Singh وAnamika Sekar وShivani Joshi وSaurabh Singh.",
 f"Viaje a Harsil y Gangotri, en Uttarakhand ({rng('es',1,3,2,3,2024,'and')}), con mis colegas Shiwam Singh, Anamika Sekar, Shivani Joshi y Saurabh Singh.",
 f"北阿坎德邦哈西尔和根戈特里之行（{rng('zh',1,3,2,3,2024,'and')}），同行的有同事 Shiwam Singh、Anamika Sekar、Shivani Joshi 和 Saurabh Singh。",
 f"ウッタラーカンド州のハルシルとガンゴートリーへの旅（{rng('ja',1,3,2,3,2024,'and')}）。同僚の Shiwam Singh、Anamika Sekar、Shivani Joshi、Saurabh Singh と一緒でした。",
 f"Viagem a Harsil e Gangotri, em Uttarakhand ({rng('pt',1,3,2,3,2024,'and')}), com meus colegas Shiwam Singh, Anamika Sekar, Shivani Joshi e Saurabh Singh.",
 f"Resa till Harsil och Gangotri i Uttarakhand ({rng('sv',1,3,2,3,2024,'and')}) med mina kollegor Shiwam Singh, Anamika Sekar, Shivani Joshi och Saurabh Singh.")

addp("This website counts visits by country only. No IP address or personal data is stored.",
 "ഈ വെബ്സൈറ്റ് സന്ദർശനങ്ങൾ രാജ്യം അടിസ്ഥാനമാക്കി മാത്രം എണ്ണുന്നു. IP വിലാസമോ വ്യക്തിഗത വിവരങ്ങളോ സൂക്ഷിക്കുന്നില്ല.",
 "यह वेबसाइट केवल देश के आधार पर विज़िट गिनती है। कोई IP पता या व्यक्तिगत डेटा संग्रहीत नहीं किया जाता।",
 "Ce site ne compte les visites que par pays. Aucune adresse IP ni donnée personnelle n'est conservée.",
 "Diese Website zählt Besuche ausschließlich nach Land. Es werden keine IP-Adressen oder personenbezogenen Daten gespeichert.",
 "يحصي هذا الموقع الزيارات حسب البلد فقط. ولا تُخزَّن أي عناوين IP أو بيانات شخصية.",
 "Este sitio web solo cuenta las visitas por país. No se almacena ninguna dirección IP ni dato personal.",
 "本网站仅按国家统计访问次数，不存储 IP 地址或任何个人数据。",
 "このウェブサイトは訪問数を国別にのみ集計しており、IP アドレスや個人データは保存しません。",
 "Este site conta as visitas apenas por país. Nenhum endereço IP ou dado pessoal é armazenado.",
 "Den här webbplatsen räknar bara besök per land. Inga IP-adresser eller personuppgifter sparas.")
