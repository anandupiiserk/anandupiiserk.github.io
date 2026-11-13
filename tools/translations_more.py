# Added strings for all ten non-English languages. Order: ml, hi, fr, de, ar, es, zh, ja, pt, sv.
M = {}
def addm(en, ml, hi, fr, de, ar, es, zh, ja, pt, sv):
    M[en] = (ml, hi, fr, de, ar, es, zh, ja, pt, sv)

addm("Subscribe to my newsletter",
 "എന്റെ വാർത്താക്കത്തിന്റെ വരിക്കാരാകുക", "मेरे न्यूज़लेटर की सदस्यता लें", "S'abonner à ma lettre d'information", "Meinen Newsletter abonnieren", "اشترك في نشرتي الإخبارية",
 "Suscribirse a mi boletín", "订阅我的通讯", "ニュースレターを購読する", "Assinar minha newsletter", "Prenumerera på mitt nyhetsbrev")
addm("News and information by email. Your email is checked with a one-time code.",
 "വാർത്തകളും വിവരങ്ങളും ഇമെയിൽ വഴി. നിങ്ങളുടെ ഇമെയിൽ ഒറ്റത്തവണ കോഡ് ഉപയോഗിച്ച് പരിശോധിക്കുന്നു.", "समाचार और जानकारी ईमेल द्वारा। आपके ईमेल की जाँच एक बार उपयोग होने वाले कोड से की जाती है।",
 "Actualités et informations par e-mail. Votre adresse e-mail est vérifiée au moyen d'un code à usage unique.", "Neuigkeiten und Informationen per E-Mail. Ihre E-Mail-Adresse wird mit einem Einmalcode überprüft.",
 "أخبار ومعلومات عبر البريد الإلكتروني. يُتحقَّق من بريدك الإلكتروني برمز يُستخدم مرة واحدة.",
 "Novedades e información por correo electrónico. Su correo se comprueba con un código de un solo uso.", "通过电子邮件获取动态和资讯。您的邮箱将通过一次性验证码进行验证。",
 "ニュースやお知らせをメールでお届けします。メールアドレスはワンタイムコードで確認します。", "Novidades e informações por e-mail. Seu e-mail é verificado com um código de uso único.",
 "Nyheter och information via e-post. Din e-postadress kontrolleras med en engångskod.")
addm("Subscribe to receive news and information from me by email. Enter your name and email, send the one-time code, then verify it: that verification subscribes you.",
 "എന്നിൽ നിന്നുള്ള വാർത്തകളും വിവരങ്ങളും ഇമെയിലിൽ ലഭിക്കാൻ വരിക്കാരാകുക. നിങ്ങളുടെ പേരും ഇമെയിലും നൽകി ഒറ്റത്തവണ കോഡ് അയയ്ക്കുക, തുടർന്ന് അത് സ്ഥിരീകരിക്കുക: ആ സ്ഥിരീകരണത്തോടെ നിങ്ങൾ വരിക്കാരാകും.",
 "मुझसे समाचार और जानकारी ईमेल द्वारा पाने के लिए सदस्यता लें। अपना नाम और ईमेल दर्ज करें, एक बार उपयोग होने वाला कोड भेजें, फिर उसे सत्यापित करें: इसी सत्यापन से आपकी सदस्यता पूरी हो जाती है।",
 "Abonnez-vous pour recevoir de mes nouvelles et des informations par e-mail. Saisissez votre nom et votre adresse e-mail, envoyez le code à usage unique, puis vérifiez-le : cette vérification vaut abonnement.",
 "Abonnieren Sie, um Neuigkeiten und Informationen von mir per E-Mail zu erhalten. Geben Sie Ihren Namen und Ihre E-Mail-Adresse ein, senden Sie den Einmalcode und bestätigen Sie ihn: Mit dieser Bestätigung sind Sie angemeldet.",
 "اشترك لتصلك مني الأخبار والمعلومات عبر البريد الإلكتروني. أدخل اسمك وبريدك الإلكتروني، ثم أرسل الرمز المخصص للاستخدام مرة واحدة وتحقق منه: بهذا التحقق يكتمل اشتراكك.",
 "Suscríbase para recibir mis novedades e información por correo electrónico. Escriba su nombre y su correo, envíe el código de un solo uso y verifíquelo: esa verificación completa la suscripción.",
 "订阅后，您将通过电子邮件收到我发布的动态和资讯。请填写姓名和邮箱，发送一次性验证码并完成验证，验证通过即视为订阅成功。",
 "メールでニュースやお知らせを受け取るには、購読してください。お名前とメールアドレスを入力し、ワンタイムコードを送信して確認します。この確認が完了すると購読が成立します。",
 "Assine para receber minhas novidades e informações por e-mail. Informe seu nome e e-mail, envie o código de uso único e confirme-o: essa verificação conclui a assinatura.",
 "Prenumerera för att få nyheter och information från mig via e-post. Ange ditt namn och din e-postadress, skicka engångskoden och verifiera den: verifieringen innebär att du prenumererar.")
addm("Send OTP", "OTP അയയ്ക്കുക", "OTP भेजें", "Envoyer le code OTP", "OTP senden", "إرسال الرمز", "Enviar OTP", "发送验证码", "OTP を送信", "Enviar OTP", "Skicka engångskod")
addm("Request approval", "അനുമതി അഭ്യർത്ഥിക്കുക", "स्वीकृति का अनुरोध करें", "Demander l'approbation", "Freigabe anfordern", "طلب الموافقة", "Solicitar aprobación", "申请批准", "承認をリクエスト", "Solicitar aprovação", "Begär godkännande")
addm("Verify and subscribe", "സ്ഥിരീകരിച്ച് വരിക്കാരാകുക", "सत्यापित करें और सदस्यता लें", "Vérifier et s'abonner", "Bestätigen und abonnieren", "تحقق واشترك", "Verificar y suscribirse", "验证并订阅", "確認して購読", "Verificar e assinar", "Verifiera och prenumerera")
addm("Resend", "വീണ്ടും അയയ്ക്കുക", "फिर से भेजें", "Renvoyer", "Erneut senden", "إعادة الإرسال", "Reenviar", "重新发送", "再送信", "Reenviar", "Skicka igen")
addm("Sent", "അയച്ചു", "भेज दिया गया", "Envoyé", "Gesendet", "تم الإرسال", "Enviado", "已发送", "送信済み", "Enviado", "Skickat")
addm("Subscribe", "വരിക്കാരാകുക", "सदस्यता लें", "S'abonner", "Abonnieren", "اشتراك", "Suscribirse", "订阅", "購読する", "Assinar", "Prenumerera")
addm("Subscribing...", "വരിക്കാരാക്കുന്നു...", "सदस्यता ली जा रही है...", "Abonnement en cours...", "Abonnement wird eingerichtet...", "جارٍ الاشتراك...", "Suscribiendo...", "正在订阅...", "購読しています...", "Assinando...", "Prenumererar...")
addm("Verifying...", "സ്ഥിരീകരിക്കുന്നു...", "सत्यापित किया जा रहा है...", "Vérification en cours...", "Wird überprüft...", "جارٍ التحقق...", "Verificando...", "正在验证...", "確認しています...", "Verificando...", "Verifierar...")
addm("OTP verification via email is mandatory to subscribe to the newsletter.",
 "വാർത്താക്കത്തിന്റെ വരിക്കാരാകാൻ ഇമെയിൽ വഴിയുള്ള OTP സ്ഥിരീകരണം നിർബന്ധമാണ്.", "न्यूज़लेटर की सदस्यता लेने के लिए ईमेल द्वारा OTP सत्यापन अनिवार्य है।",
 "La vérification par code OTP envoyé par e-mail est obligatoire pour s'abonner à la lettre d'information.", "Zum Abonnieren des Newsletters ist die OTP-Bestätigung per E-Mail erforderlich.",
 "التحقق برمز OTP عبر البريد الإلكتروني إلزامي للاشتراك في النشرة الإخبارية.", "La verificación mediante OTP por correo electrónico es obligatoria para suscribirse al boletín.",
 "订阅通讯须通过电子邮件进行 OTP 验证。", "ニュースレターを購読するには、メールによる OTP 認証が必要です。", "A verificação por OTP enviado por e-mail é obrigatória para assinar a newsletter.",
 "Verifiering med engångskod (OTP) via e-post krävs för att prenumerera på nyhetsbrevet.")
addm("OTP verification via email is mandatory to send a message or book an appointment.",
 "സന്ദേശം അയയ്ക്കാനോ അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യാനോ ഇമെയിൽ വഴിയുള്ള OTP സ്ഥിരീകരണം നിർബന്ധമാണ്.", "संदेश भेजने या अपॉइंटमेंट बुक करने के लिए ईमेल द्वारा OTP सत्यापन अनिवार्य है।",
 "La vérification par code OTP envoyé par e-mail est obligatoire pour envoyer un message ou prendre rendez-vous.", "Zum Senden einer Nachricht oder zum Buchen eines Termins ist die OTP-Bestätigung per E-Mail erforderlich.",
 "التحقق برمز OTP عبر البريد الإلكتروني إلزامي لإرسال رسالة أو حجز موعد.", "La verificación mediante OTP por correo electrónico es obligatoria para enviar un mensaje o reservar una cita.",
 "发送留言或预约须通过电子邮件进行 OTP 验证。", "メッセージの送信や予約には、メールによる OTP 認証が必要です。", "A verificação por OTP enviado por e-mail é obrigatória para enviar uma mensagem ou agendar um horário.",
 "Verifiering med engångskod (OTP) via e-post krävs för att skicka ett meddelande eller boka en tid.")
addm("Request an appointment", "അപ്പോയിന്റ്മെന്റിന് അഭ്യർത്ഥിക്കുക", "अपॉइंटमेंट का अनुरोध करें", "Demander un rendez-vous", "Termin anfragen", "طلب موعد", "Solicitar una cita", "预约会面", "面談を予約する", "Solicitar um horário", "Begär en tid")
addm("Request appointment", "അപ്പോയിന്റ്മെന്റ് അഭ്യർത്ഥിക്കുക", "अपॉइंटमेंट का अनुरोध करें", "Demander un rendez-vous", "Termin anfragen", "طلب الموعد", "Solicitar cita", "提交预约申请", "予約をリクエスト", "Solicitar horário", "Begär tid")
addm("What would you like to discuss?", "എന്താണ് ചർച്ച ചെയ്യാൻ ആഗ്രഹിക്കുന്നത്?", "आप किस विषय पर चर्चा करना चाहेंगे?", "De quoi souhaitez-vous discuter ?", "Worüber möchten Sie sprechen?", "ما الموضوع الذي ترغب في مناقشته؟",
 "¿De qué le gustaría hablar?", "您想讨论什么？", "どのようなことについてお話しになりたいですか？", "Sobre o que você gostaria de conversar?", "Vad vill du diskutera?")
addm("30 minutes", "30 മിനിറ്റ്", "30 मिनट", "30 minutes", "30 Minuten", "30 دقيقة", "30 minutos", "30 分钟", "30分", "30 minutos", "30 minuter")
addm("60 minutes", "60 മിനിറ്റ്", "60 मिनट", "60 minutes", "60 Minuten", "60 دقيقة", "60 minutos", "60 分钟", "60分", "60 minutos", "60 minuter")
addm("Booked / unavailable", "ബുക്ക് ചെയ്തത് / ലഭ്യമല്ല", "बुक / अनुपलब्ध", "Réservé / indisponible", "Belegt / nicht verfügbar", "محجوز / غير متاح", "Reservado / no disponible", "已预约 / 不可用", "予約済み / 利用不可", "Reservado / indisponível", "Bokad / ej tillgänglig")
addm("No slot chosen yet", "സമയം ഇതുവരെ തിരഞ്ഞെടുത്തിട്ടില്ല", "अभी तक कोई समय नहीं चुना गया", "Aucun créneau choisi pour le moment", "Noch kein Termin ausgewählt", "لم يُختر موعد بعد", "Aún no se ha elegido ninguna franja", "尚未选择时段", "時間枠がまだ選択されていません", "Nenhum horário escolhido ainda", "Ingen tid vald ännu")
addm("This slot is booked or unavailable. Please choose another time.",
 "ഈ സമയം ബുക്ക് ചെയ്തിരിക്കുന്നു അല്ലെങ്കിൽ ലഭ്യമല്ല. മറ്റൊരു സമയം തിരഞ്ഞെടുക്കുക.", "यह समय बुक है या उपलब्ध नहीं है। कृपया कोई और समय चुनें।",
 "Ce créneau est réservé ou indisponible. Veuillez choisir un autre horaire.", "Dieser Termin ist belegt oder nicht verfügbar. Bitte wählen Sie eine andere Zeit.",
 "هذا الموعد محجوز أو غير متاح. يُرجى اختيار وقت آخر.", "Esta franja está reservada o no disponible. Elija otro horario.",
 "该时段已被预约或不可用，请选择其他时间。", "この時間枠は予約済みか、利用できません。別の時間を選択してください。", "Este horário está reservado ou indisponível. Escolha outro horário.",
 "Den här tiden är bokad eller inte tillgänglig. Välj en annan tid.")
addm("Appointments of 30 or 60 minutes, Monday to Friday, 10:00 to 18:00, and Saturday, 10:30 to 17:00, Indian Standard Time (IST), over the next two months. Sundays, public holidays and days when I am away are not available. Choose a length, a day and a time, add your details and send the request. The slot is confirmed by email once I reply.",
 "30 അല്ലെങ്കിൽ 60 മിനിറ്റ് അപ്പോയിന്റ്മെന്റുകൾ, തിങ്കൾ മുതൽ വെള്ളി വരെ രാവിലെ 10:00 മുതൽ വൈകുന്നേരം 18:00 വരെയും ശനിയാഴ്ച രാവിലെ 10:30 മുതൽ വൈകുന്നേരം 17:00 വരെയും, ഇന്ത്യൻ സ്റ്റാൻഡേർഡ് ടൈം (IST), അടുത്ത രണ്ട് മാസത്തേക്ക്. ഞായറാഴ്ചകളിലും പൊതു അവധി ദിവസങ്ങളിലും ഞാൻ സ്ഥലത്തില്ലാത്ത ദിവസങ്ങളിലും ലഭ്യമല്ല. ദൈർഘ്യം, ദിവസം, സമയം എന്നിവ തിരഞ്ഞെടുത്ത് നിങ്ങളുടെ വിവരങ്ങൾ ചേർത്ത് അഭ്യർത്ഥന അയയ്ക്കുക. ഞാൻ മറുപടി നൽകിയാൽ സമയം ഇമെയിൽ വഴി സ്ഥിരീകരിക്കും.",
 "30 या 60 मिनट की अपॉइंटमेंट, सोमवार से शुक्रवार सुबह 10:00 से शाम 18:00 बजे तक और शनिवार सुबह 10:30 से शाम 17:00 बजे तक, भारतीय मानक समय (IST), अगले दो महीनों के लिए। रविवार, सार्वजनिक अवकाश और मेरी अनुपस्थिति के दिन उपलब्ध नहीं हैं। अवधि, दिन और समय चुनें, अपना विवरण भरें और अनुरोध भेजें। मेरे उत्तर देने के बाद समय की पुष्टि ईमेल द्वारा की जाएगी।",
 "Rendez-vous de 30 ou 60 minutes, du lundi au vendredi de 10 h 00 à 18 h 00 et le samedi de 10 h 30 à 17 h 00 (heure normale de l'Inde, IST), sur les deux prochains mois. Les dimanches, les jours fériés et les jours où je suis absent ne sont pas disponibles. Choisissez une durée, un jour et un horaire, renseignez vos coordonnées et envoyez la demande. Le créneau est confirmé par e-mail dès que je réponds.",
 "Termine von 30 oder 60 Minuten, Montag bis Freitag von 10:00 bis 18:00 Uhr und samstags von 10:30 bis 17:00 Uhr (indische Standardzeit, IST), für die nächsten zwei Monate. Sonntage, Feiertage und Tage, an denen ich abwesend bin, sind nicht verfügbar. Wählen Sie eine Dauer, einen Tag und eine Uhrzeit, geben Sie Ihre Daten ein und senden Sie die Anfrage. Der Termin wird per E-Mail bestätigt, sobald ich antworte.",
 "مواعيد مدتها 30 أو 60 دقيقة، من الاثنين إلى الجمعة من 10:00 إلى 18:00 ويوم السبت من 10:30 إلى 17:00 بالتوقيت القياسي الهندي (IST)، خلال الشهرين القادمين. أيام الأحد والعطلات الرسمية والأيام التي أكون فيها غائبًا غير متاحة. اختر المدة واليوم والوقت، وأدخل بياناتك وأرسل الطلب. يتم تأكيد الموعد عبر البريد الإلكتروني فور ردّي.",
 "Citas de 30 o 60 minutos, de lunes a viernes de 10:00 a 18:00 y los sábados de 10:30 a 17:00 (hora estándar de la India, IST), durante los próximos dos meses. Los domingos, los días festivos y los días en que estoy ausente no están disponibles. Elija una duración, un día y una hora, añada sus datos y envíe la solicitud. La cita se confirma por correo electrónico cuando yo responda.",
 "预约时长为 30 或 60 分钟，周一至周五 10:00 至 18:00，周六 10:30 至 17:00，印度标准时间（IST），未来两个月可预约。周日、公共假日以及我不在的日子不可预约。请选择时长、日期和时间，填写您的信息并发送请求。我回复后将通过电子邮件确认该时段。",
 "30分または60分の面談を、今後2か月間、月曜から金曜は10:00〜18:00、土曜は10:30〜17:00（インド標準時、IST）で受け付けています。日曜、祝日、不在の日はご利用いただけません。時間の長さ、日付、時刻を選び、ご連絡先を入力してリクエストを送信してください。私が返信した後、メールで日時を確定します。",
 "Horários de 30 ou 60 minutos, de segunda a sexta-feira das 10:00 às 18:00 e aos sábados das 10:30 às 17:00 (hora padrão da Índia, IST), nos próximos dois meses. Domingos, feriados e dias em que estou ausente não estão disponíveis. Escolha uma duração, um dia e um horário, preencha seus dados e envie o pedido. O horário é confirmado por e-mail assim que eu responder.",
 "Tider på 30 eller 60 minuter, måndag till fredag kl. 10:00 till 18:00 och lördag kl. 10:30 till 17:00 (indisk standardtid, IST), under de kommande två månaderna. Söndagar, helgdagar och dagar då jag är borta är inte tillgängliga. Välj en längd, en dag och en tid, fyll i dina uppgifter och skicka förfrågan. Tiden bekräftas via e-post när jag har svarat.")
addm("Weekend appointments may or may not be available and will be confirmed upon submission.",
 "വാരാന്ത്യ അപ്പോയിന്റ്മെന്റുകൾ ലഭ്യമായേക്കാം, ലഭ്യമല്ലാതെയും വരാം; സമർപ്പിച്ചതിന് ശേഷം സ്ഥിരീകരിക്കും.",
 "सप्ताहांत की अपॉइंटमेंट उपलब्ध हो भी सकती है और नहीं भी; अनुरोध जमा करने के बाद इसकी पुष्टि की जाएगी।",
 "Les rendez-vous le week-end ne sont pas toujours possibles ; ils seront confirmés après l'envoi de la demande.",
 "Termine am Wochenende sind möglicherweise nicht verfügbar und werden nach dem Absenden bestätigt.",
 "قد تكون مواعيد عطلة نهاية الأسبوع متاحة أو غير متاحة، وسيتم تأكيدها بعد إرسال الطلب.",
 "Las citas en fin de semana pueden estar disponibles o no, y se confirmarán tras enviar la solicitud.",
 "周末预约不一定可行，将在提交后确认。",
 "週末の予約はお受けできない場合があります。送信後に確定をご連絡します。",
 "Os horários de fim de semana podem ou não estar disponíveis e serão confirmados após o envio.",
 "Helgtider kan vara tillgängliga eller inte och bekräftas efter att förfrågan skickats.")
addm("Postal address", "തപാൽ വിലാസം", "डाक का पता", "Adresse postale", "Postanschrift", "العنوان البريدي", "Dirección postal", "邮寄地址", "郵送先住所", "Endereço postal", "Postadress")
addm("Copy address", "വിലാസം പകർത്തുക", "पता कॉपी करें", "Copier l'adresse", "Adresse kopieren", "نسخ العنوان", "Copiar dirección", "复制地址", "住所をコピー", "Copiar endereço", "Kopiera adressen")
addm("Share address", "വിലാസം പങ്കിടുക", "पता साझा करें", "Partager l'adresse", "Adresse teilen", "مشاركة العنوان", "Compartir dirección", "分享地址", "住所を共有", "Compartilhar endereço", "Dela adressen")
addm("Share postal address", "തപാൽ വിലാസം പങ്കിടുക", "डाक का पता साझा करें", "Partager l'adresse postale", "Postanschrift teilen", "مشاركة العنوان البريدي", "Compartir dirección postal", "分享邮寄地址", "郵送先住所を共有", "Compartilhar endereço postal", "Dela postadressen")
addm("Copy", "പകർത്തുക", "कॉपी करें", "Copier", "Kopieren", "نسخ", "Copiar", "复制", "コピー", "Copiar", "Kopiera")
addm("Language change", "ഭാഷ മാറ്റം", "भाषा परिवर्तन", "Changement de langue", "Sprachwechsel", "تغيير اللغة", "Cambio de idioma", "切换语言", "言語の切り替え", "Mudança de idioma", "Språkbyte")
addm("Reset language to English", "ഭാഷ ഇംഗ്ലീഷിലേക്ക് പുനഃസജ്ജമാക്കുക", "भाषा को अंग्रेज़ी पर रीसेट करें", "Revenir à l'anglais", "Sprache auf Englisch zurücksetzen", "إعادة اللغة إلى الإنجليزية", "Restablecer el idioma a inglés", "将语言重置为英语", "言語を英語に戻す", "Redefinir o idioma para inglês", "Återställ språket till engelska")
addm("Turn on the voice assistant (V) to change language with L. Otherwise use the language button.",
 "L ഉപയോഗിച്ച് ഭാഷ മാറ്റാൻ വോയ്‌സ് അസിസ്റ്റന്റ് (V) ഓണാക്കുക. അല്ലെങ്കിൽ ഭാഷാ ബട്ടൺ ഉപയോഗിക്കുക.", "L से भाषा बदलने के लिए वॉइस असिस्टेंट (V) चालू करें। अन्यथा भाषा बटन का उपयोग करें।",
 "Activez l'assistant vocal (V) pour changer de langue avec L. Sinon, utilisez le bouton de langue.", "Schalten Sie den Sprachassistenten (V) ein, um die Sprache mit L zu wechseln. Andernfalls verwenden Sie die Sprachtaste.",
 "فعِّل المساعد الصوتي (V) لتغيير اللغة بالمفتاح L. وإلا فاستخدم زر اللغة.", "Active el asistente de voz (V) para cambiar de idioma con L. Si no, use el botón de idioma.",
 "开启语音助手（V）后，可按 L 键切换语言；否则请使用语言按钮。", "音声アシスタント（V）をオンにすると、L キーで言語を切り替えられます。それ以外の場合は言語ボタンを使ってください。",
 "Ative o assistente de voz (V) para mudar o idioma com a tecla L. Caso contrário, use o botão de idioma.", "Slå på röstassistenten (V) för att byta språk med L. Annars använder du språkknappen.")
addm("This website was partially developed and is maintained with the help of Claude, an AI assistant made by Anthropic.",
 "ഈ വെബ്സൈറ്റ് ഭാഗികമായി വികസിപ്പിച്ചതും പരിപാലിക്കുന്നതും Anthropic നിർമ്മിച്ച AI അസിസ്റ്റന്റായ Claude-ന്റെ സഹായത്തോടെയാണ്.", "यह वेबसाइट आंशिक रूप से Anthropic द्वारा बनाए गए AI सहायक Claude की मदद से विकसित की गई है और उसी की सहायता से इसका रखरखाव किया जाता है।",
 "Ce site a été en partie développé, et est maintenu, avec l'aide de Claude, un assistant d'IA conçu par Anthropic.", "Diese Website wurde teilweise mit Unterstützung von Claude, einem KI-Assistenten von Anthropic, entwickelt und wird damit gepflegt.",
 "طُوِّر هذا الموقع جزئيًا ويُصان بمساعدة Claude، وهو مساعد ذكاء اصطناعي من تطوير Anthropic.", "Este sitio web se ha desarrollado en parte, y se mantiene, con la ayuda de Claude, un asistente de IA creado por Anthropic.",
 "本网站部分由 Anthropic 开发的 AI 助手 Claude 协助开发并维护。", "このウェブサイトは、Anthropic が開発した AI アシスタント Claude の協力を得て、一部を開発し、保守しています。",
 "Este site foi desenvolvido em parte, e é mantido, com a ajuda do Claude, um assistente de IA criado pela Anthropic.", "Den här webbplatsen har delvis utvecklats och underhålls med hjälp av Claude, en AI-assistent från Anthropic.")

# ---- dynamic messages and controls ----
addm("Could not check the OTP. Please try again.",
 "OTP പരിശോധിക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.", "OTP की जाँच नहीं हो सकी। कृपया पुनः प्रयास करें।", "Impossible de vérifier le code OTP. Veuillez réessayer.", "Der OTP konnte nicht überprüft werden. Bitte versuchen Sie es erneut.",
 "تعذّر التحقق من الرمز. يُرجى المحاولة مرة أخرى.", "No se pudo comprobar el OTP. Inténtelo de nuevo.", "无法验证 OTP，请重试。", "OTP を確認できませんでした。もう一度お試しください。", "Não foi possível verificar o OTP. Tente novamente.", "Det gick inte att kontrollera engångskoden. Försök igen.")
addm("Could not send the OTP. Please try again.",
 "OTP അയയ്ക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.", "OTP नहीं भेजा जा सका। कृपया पुनः प्रयास करें।", "Impossible d'envoyer le code OTP. Veuillez réessayer.", "Der OTP konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
 "تعذّر إرسال الرمز. يُرجى المحاولة مرة أخرى.", "No se pudo enviar el OTP. Inténtelo de nuevo.", "无法发送 OTP，请重试。", "OTP を送信できませんでした。もう一度お試しください。", "Não foi possível enviar o OTP. Tente novamente.", "Det gick inte att skicka engångskoden. Försök igen.")
addm("Could not send the request. Please try again.",
 "അഭ്യർത്ഥന അയയ്ക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.", "अनुरोध नहीं भेजा जा सका। कृपया पुनः प्रयास करें।", "Impossible d'envoyer la demande. Veuillez réessayer.", "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
 "تعذّر إرسال الطلب. يُرجى المحاولة مرة أخرى.", "No se pudo enviar la solicitud. Inténtelo de nuevo.", "无法发送申请，请重试。", "リクエストを送信できませんでした。もう一度お試しください。", "Não foi possível enviar a solicitação. Tente novamente.", "Det gick inte att skicka begäran. Försök igen.")
addm("Could not subscribe. Please try again.",
 "വരിക്കാരാകാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.", "सदस्यता नहीं ली जा सकी। कृपया पुनः प्रयास करें।", "Impossible de vous abonner. Veuillez réessayer.", "Das Abonnement konnte nicht eingerichtet werden. Bitte versuchen Sie es erneut.",
 "تعذّر الاشتراك. يُرجى المحاولة مرة أخرى.", "No se pudo completar la suscripción. Inténtelo de nuevo.", "无法完成订阅，请重试。", "購読できませんでした。もう一度お試しください。", "Não foi possível assinar. Tente novamente.", "Det gick inte att prenumerera. Försök igen.")
addm("Enter the 6-digit OTP.", "6 അക്ക OTP നൽകുക.", "6 अंकों का OTP दर्ज करें।", "Saisissez le code OTP à 6 chiffres.", "Geben Sie den 6-stelligen OTP ein.", "أدخل الرمز المكوّن من 6 أرقام.", "Introduzca el OTP de 6 dígitos.", "请输入 6 位 OTP。", "6桁の OTP を入力してください。", "Digite o OTP de 6 dígitos.", "Ange den sexsiffriga engångskoden.")
addm("Enter your name first.", "ആദ്യം നിങ്ങളുടെ പേര് നൽകുക.", "पहले अपना नाम दर्ज करें।", "Saisissez d'abord votre nom.", "Geben Sie zuerst Ihren Namen ein.", "أدخل اسمك أولًا.", "Escriba primero su nombre.", "请先输入您的姓名。", "先にお名前を入力してください。", "Informe primeiro o seu nome.", "Ange först ditt namn.")
addm("OTP expired. Send a new one.", "OTP-യുടെ കാലാവധി കഴിഞ്ഞു. പുതിയത് അയയ്ക്കുക.", "OTP की अवधि समाप्त हो गई। नया भेजें।", "Le code OTP a expiré. Envoyez-en un nouveau.", "Der OTP ist abgelaufen. Senden Sie einen neuen.",
 "انتهت صلاحية الرمز. أرسل رمزًا جديدًا.", "El OTP ha caducado. Envíe uno nuevo.", "OTP 已过期，请重新发送。", "OTP の有効期限が切れました。新しいものを送信してください。", "O OTP expirou. Envie um novo.", "Engångskoden har gått ut. Skicka en ny.")
addm("OTP sent to {email}. Enter OTP to proceed.",
 "{email} എന്ന വിലാസത്തിലേക്ക് OTP അയച്ചു. തുടരാൻ OTP നൽകുക.", "OTP {email} पर भेज दिया गया है। आगे बढ़ने के लिए OTP दर्ज करें।", "Le code OTP a été envoyé à {email}. Saisissez-le pour continuer.", "Der OTP wurde an {email} gesendet. Geben Sie ihn ein, um fortzufahren.",
 "أُرسل الرمز إلى {email}. أدخل الرمز للمتابعة.", "Se ha enviado el OTP a {email}. Introdúzcalo para continuar.", "OTP 已发送至 {email}，请输入 OTP 以继续。", "OTP を {email} に送信しました。続けるには OTP を入力してください。", "O OTP foi enviado para {email}. Digite o OTP para continuar.", "Engångskoden har skickats till {email}. Ange den för att fortsätta.")
addm("Wrong OTP. {n} tries left.", "OTP തെറ്റാണ്. {n} ശ്രമങ്ങൾ ബാക്കിയുണ്ട്.", "OTP गलत है। {n} प्रयास शेष हैं।", "Code OTP incorrect. Il vous reste {n} essai(s).", "Falscher OTP. Noch {n} Versuch(e).",
 "الرمز غير صحيح. المحاولات المتبقية: {n}.", "OTP incorrecto. Le quedan {n} intento(s).", "OTP 错误，还剩 {n} 次机会。", "OTP が正しくありません。残り {n} 回です。", "OTP incorreto. Restam {n} tentativa(s).", "Fel engångskod. {n} försök kvar.")
addm("Please choose a day and a time.", "ഒരു ദിവസവും സമയവും തിരഞ്ഞെടുക്കുക.", "कृपया एक दिन और एक समय चुनें।", "Veuillez choisir un jour et un horaire.", "Bitte wählen Sie einen Tag und eine Uhrzeit.", "يُرجى اختيار يوم ووقت.", "Elija un día y una hora.", "请选择日期和时间。", "日付と時刻を選択してください。", "Escolha um dia e um horário.", "Välj en dag och en tid.")
addm("Please verify your email with the OTP first.", "ആദ്യം OTP ഉപയോഗിച്ച് നിങ്ങളുടെ ഇമെയിൽ സ്ഥിരീകരിക്കുക.", "कृपया पहले OTP से अपने ईमेल का सत्यापन करें।", "Veuillez d'abord vérifier votre adresse e-mail avec le code OTP.", "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse mit dem OTP.",
 "يُرجى التحقق من بريدك الإلكتروني بالرمز أولًا.", "Verifique primero su correo electrónico con el OTP.", "请先使用 OTP 验证您的邮箱。", "先に OTP でメールアドレスを確認してください。", "Verifique primeiro o seu e-mail com o OTP.", "Verifiera först din e-postadress med engångskoden.")
addm("Request sent. I will reply by email once I decide. Then come back here and send the OTP.",
 "അഭ്യർത്ഥന അയച്ചു. ഞാൻ തീരുമാനിച്ചാൽ ഇമെയിലിൽ മറുപടി നൽകും. അതിനുശേഷം ഇവിടെ തിരിച്ചെത്തി OTP അയയ്ക്കുക.", "अनुरोध भेज दिया गया है। निर्णय लेने के बाद मैं ईमेल से उत्तर दूँगा। उसके बाद यहाँ लौटकर OTP भेजें।",
 "Demande envoyée. Je répondrai par e-mail dès que j'aurai décidé. Revenez ensuite ici pour envoyer le code OTP.", "Anfrage gesendet. Ich antworte per E-Mail, sobald ich entschieden habe. Kommen Sie danach hierher zurück und senden Sie den OTP.",
 "أُرسل الطلب. سأرد عبر البريد الإلكتروني بعد أن أقرر. ثم عد إلى هنا وأرسل الرمز.", "Solicitud enviada. Responderé por correo electrónico cuando lo decida. Después vuelva aquí y envíe el OTP.",
 "申请已发送。我作出决定后会通过电子邮件回复您，之后请回到此处发送 OTP。", "リクエストを送信しました。判断でき次第、メールでご返信します。その後、このページに戻って OTP を送信してください。",
 "Solicitação enviada. Responderei por e-mail assim que decidir. Depois volte aqui e envie o OTP.", "Begäran har skickats. Jag svarar via e-post när jag har bestämt mig. Kom sedan tillbaka hit och skicka engångskoden.")
addm("That time is no longer available. Please choose another.", "ആ സമയം ഇപ്പോൾ ലഭ്യമല്ല. മറ്റൊന്ന് തിരഞ്ഞെടുക്കുക.", "वह समय अब उपलब्ध नहीं है। कृपया कोई और चुनें।", "Cet horaire n'est plus disponible. Veuillez en choisir un autre.", "Diese Zeit ist nicht mehr verfügbar. Bitte wählen Sie eine andere.",
 "هذا الوقت لم يعد متاحًا. يُرجى اختيار وقت آخر.", "Ese horario ya no está disponible. Elija otro.", "该时间已不可用，请另选一个。", "その時間は利用できなくなりました。別の時間を選択してください。", "Esse horário não está mais disponível. Escolha outro.", "Den tiden är inte längre tillgänglig. Välj en annan.")
addm("The OTP service is busy today. Please try again tomorrow or email me directly.",
 "OTP സേവനം ഇന്ന് തിരക്കിലാണ്. നാളെ വീണ്ടും ശ്രമിക്കുക, അല്ലെങ്കിൽ എനിക്ക് നേരിട്ട് ഇമെയിൽ അയയ്ക്കുക.", "OTP सेवा आज व्यस्त है। कृपया कल पुनः प्रयास करें या मुझे सीधे ईमेल करें।",
 "Le service OTP est très sollicité aujourd'hui. Veuillez réessayer demain ou m'écrire directement par e-mail.", "Der OTP-Dienst ist heute ausgelastet. Bitte versuchen Sie es morgen erneut oder schreiben Sie mir direkt eine E-Mail.",
 "خدمة الرمز مزدحمة اليوم. يُرجى المحاولة غدًا أو مراسلتي مباشرة عبر البريد الإلكتروني.", "El servicio de OTP está saturado hoy. Inténtelo mañana o escríbame directamente por correo electrónico.",
 "OTP 服务今天较为繁忙，请明天再试，或直接给我发邮件。", "本日は OTP サービスが混み合っています。明日もう一度お試しいただくか、直接メールでご連絡ください。",
 "O serviço de OTP está ocupado hoje. Tente novamente amanhã ou escreva-me diretamente por e-mail.", "OTP-tjänsten är hårt belastad i dag. Försök igen i morgon eller mejla mig direkt.")
addm("The gallery is temporarily switched off.", "ഗാലറി താൽക്കാലികമായി ഓഫ് ചെയ്തിരിക്കുന്നു.", "गैलरी अस्थायी रूप से बंद है।", "La galerie est temporairement désactivée.", "Die Galerie ist vorübergehend deaktiviert.", "المعرض متوقف مؤقتًا.", "La galería está desactivada temporalmente.", "图库暂时关闭。", "ギャラリーは一時的に停止しています。", "A galeria está temporariamente desativada.", "Galleriet är tillfälligt avstängt.")
addm("This address does not need approval. Send the OTP.", "ഈ വിലാസത്തിന് അനുമതി ആവശ്യമില്ല. OTP അയയ്ക്കുക.", "इस पते के लिए स्वीकृति की आवश्यकता नहीं है। OTP भेजें।", "Cette adresse ne nécessite pas d'approbation. Envoyez le code OTP.", "Für diese Adresse ist keine Freigabe nötig. Senden Sie den OTP.",
 "لا يحتاج هذا العنوان إلى موافقة. أرسل الرمز.", "Esta dirección no necesita aprobación. Envíe el OTP.", "此邮箱无需批准，请直接发送 OTP。", "このアドレスは承認不要です。OTP を送信してください。", "Este endereço não precisa de aprovação. Envie o OTP.", "Den här adressen behöver inget godkännande. Skicka engångskoden.")
addm("This address was declined recently.", "ഈ വിലാസം അടുത്തിടെ നിരസിച്ചിരുന്നു.", "इस पते को हाल ही में अस्वीकार किया गया था।", "Cette adresse a été refusée récemment.", "Diese Adresse wurde kürzlich abgelehnt.", "رُفض هذا العنوان مؤخرًا.", "Esta dirección fue rechazada recientemente.", "此邮箱近期已被拒绝。", "このアドレスは最近承認されませんでした。", "Este endereço foi recusado recentemente.", "Den här adressen har nyligen avslagits.")
addm("This email is already subscribed.", "ഈ ഇമെയിൽ ഇതിനകം വരിക്കാരാണ്.", "यह ईमेल पहले से सदस्य है।", "Cette adresse e-mail est déjà abonnée.", "Diese E-Mail-Adresse ist bereits angemeldet.", "هذا البريد الإلكتروني مشترك بالفعل.", "Este correo electrónico ya está suscrito.", "此邮箱已订阅。", "このメールアドレスはすでに購読されています。", "Este e-mail já está inscrito.", "Den här e-postadressen prenumererar redan.")
addm("Too many codes requested for this address. Please try again in an hour.", "ഈ വിലാസത്തിന് വളരെയധികം കോഡുകൾ ആവശ്യപ്പെട്ടു. ഒരു മണിക്കൂറിനുശേഷം വീണ്ടും ശ്രമിക്കുക.", "इस पते के लिए बहुत अधिक कोड माँगे गए हैं। कृपया एक घंटे बाद पुनः प्रयास करें।",
 "Trop de codes ont été demandés pour cette adresse. Veuillez réessayer dans une heure.", "Für diese Adresse wurden zu viele Codes angefordert. Bitte versuchen Sie es in einer Stunde erneut.",
 "طُلب عدد كبير جدًا من الرموز لهذا العنوان. يُرجى المحاولة بعد ساعة.", "Se han solicitado demasiados códigos para esta dirección. Inténtelo de nuevo dentro de una hora.",
 "此邮箱请求的验证码过多，请一小时后再试。", "このアドレスでのコード請求が多すぎます。1時間後にもう一度お試しください。", "Foram solicitados códigos demais para este endereço. Tente novamente em uma hora.", "För många koder har begärts för den här adressen. Försök igen om en timme.")
addm("Too many requests today. Please try again tomorrow.", "ഇന്ന് വളരെയധികം അഭ്യർത്ഥനകൾ ഉണ്ടായി. നാളെ വീണ്ടും ശ്രമിക്കുക.", "आज बहुत अधिक अनुरोध हो चुके हैं। कृपया कल पुनः प्रयास करें।", "Trop de demandes aujourd'hui. Veuillez réessayer demain.", "Heute gab es zu viele Anfragen. Bitte versuchen Sie es morgen erneut.",
 "عدد الطلبات اليوم كبير جدًا. يُرجى المحاولة غدًا.", "Demasiadas solicitudes hoy. Inténtelo de nuevo mañana.", "今天的请求次数过多，请明天再试。", "本日のリクエスト数が上限に達しました。明日もう一度お試しください。", "Muitas solicitações hoje. Tente novamente amanhã.", "För många förfrågningar i dag. Försök igen i morgon.")
addm("Too many wrong tries. Send a new OTP.", "തെറ്റായ ശ്രമങ്ങൾ വളരെയധികമായി. പുതിയ OTP അയയ്ക്കുക.", "बहुत अधिक गलत प्रयास हो चुके हैं। नया OTP भेजें।", "Trop d'essais incorrects. Envoyez un nouveau code OTP.", "Zu viele Fehlversuche. Senden Sie einen neuen OTP.",
 "محاولات خاطئة كثيرة. أرسل رمزًا جديدًا.", "Demasiados intentos fallidos. Envíe un OTP nuevo.", "错误次数过多，请重新发送 OTP。", "誤入力が多すぎます。新しい OTP を送信してください。", "Muitas tentativas incorretas. Envie um novo OTP.", "För många felaktiga försök. Skicka en ny engångskod.")
addm("Unfortunately, you cannot subscribe here.", "ക്ഷമിക്കണം, നിങ്ങൾക്ക് ഇവിടെ വരിക്കാരാകാൻ കഴിയില്ല.", "क्षमा करें, आप यहाँ सदस्यता नहीं ले सकते।", "Malheureusement, vous ne pouvez pas vous abonner ici.", "Leider können Sie hier nicht abonnieren.",
 "للأسف، لا يمكنك الاشتراك هنا.", "Lamentablemente, no puede suscribirse aquí.", "很抱歉，您无法在此订阅。", "申し訳ありませんが、こちらからは購読できません。", "Infelizmente, você não pode assinar aqui.", "Tyvärr kan du inte prenumerera här.")
addm("Verification expired. Send a new OTP.", "സ്ഥിരീകരണത്തിന്റെ കാലാവധി കഴിഞ്ഞു. പുതിയ OTP അയയ്ക്കുക.", "सत्यापन की अवधि समाप्त हो गई। नया OTP भेजें।", "La vérification a expiré. Envoyez un nouveau code OTP.", "Die Bestätigung ist abgelaufen. Senden Sie einen neuen OTP.",
 "انتهت صلاحية التحقق. أرسل رمزًا جديدًا.", "La verificación ha caducado. Envíe un OTP nuevo.", "验证已过期，请重新发送 OTP。", "認証の有効期限が切れました。新しい OTP を送信してください。", "A verificação expirou. Envie um novo OTP.", "Verifieringen har gått ut. Skicka en ny engångskod.")
addm("Verified, but could not subscribe. Please send a new OTP and try again.", "സ്ഥിരീകരിച്ചു, പക്ഷേ വരിക്കാരാകാൻ കഴിഞ്ഞില്ല. പുതിയ OTP അയച്ച് വീണ്ടും ശ്രമിക്കുക.", "सत्यापन हो गया, लेकिन सदस्यता नहीं ली जा सकी। कृपया नया OTP भेजकर पुनः प्रयास करें।",
 "Vérification réussie, mais l'abonnement a échoué. Veuillez envoyer un nouveau code OTP et réessayer.", "Bestätigt, aber das Abonnement konnte nicht eingerichtet werden. Bitte senden Sie einen neuen OTP und versuchen Sie es erneut.",
 "تم التحقق، لكن تعذّر الاشتراك. يُرجى إرسال رمز جديد والمحاولة مرة أخرى.", "Verificado, pero no se pudo completar la suscripción. Envíe un OTP nuevo e inténtelo de nuevo.",
 "验证已通过，但订阅未能完成。请重新发送 OTP 后再试。", "確認は完了しましたが、購読できませんでした。新しい OTP を送信して、もう一度お試しください。", "Verificado, mas não foi possível assinar. Envie um novo OTP e tente novamente.", "Verifieringen lyckades, men det gick inte att prenumerera. Skicka en ny engångskod och försök igen.")
addm("✓ Email already verified. Press Subscribe to finish.", "✓ ഇമെയിൽ ഇതിനകം സ്ഥിരീകരിച്ചു. പൂർത്തിയാക്കാൻ വരിക്കാരാകുക അമർത്തുക.", "✓ ईमेल पहले ही सत्यापित हो चुका है। पूरा करने के लिए सदस्यता लें दबाएँ।", "✓ Adresse e-mail déjà vérifiée. Appuyez sur « S'abonner » pour terminer.", "✓ E-Mail-Adresse bereits bestätigt. Klicken Sie auf „Abonnieren“, um abzuschließen.",
 "✓ تم التحقق من البريد الإلكتروني مسبقًا. اضغط «اشتراك» لإكمال العملية.", "✓ El correo ya está verificado. Pulse «Suscribirse» para terminar.", "✓ 邮箱已验证。点击“订阅”即可完成。", "✓ メールアドレスは確認済みです。「購読する」を押して完了してください。", "✓ E-mail já verificado. Pressione «Assinar» para concluir.", "✓ E-postadressen är redan verifierad. Tryck på Prenumerera för att slutföra.")
addm("✓ Email verified and subscribed. Thank you!", "✓ ഇമെയിൽ സ്ഥിരീകരിച്ചു, വരിക്കാരായി. നന്ദി!", "✓ ईमेल सत्यापित हो गया और आपकी सदस्यता पूरी हुई। धन्यवाद!", "✓ Adresse e-mail vérifiée et abonnement enregistré. Merci !", "✓ E-Mail-Adresse bestätigt und Abonnement eingerichtet. Vielen Dank!",
 "✓ تم التحقق من البريد الإلكتروني وإتمام الاشتراك. شكرًا لك!", "✓ Correo verificado y suscripción completada. ¡Gracias!", "✓ 邮箱已验证，订阅成功。谢谢！", "✓ メールアドレスを確認し、購読が完了しました。ありがとうございます。", "✓ E-mail verificado e assinatura concluída. Obrigado!", "✓ E-postadressen är verifierad och prenumerationen är klar. Tack!")
addm("✓ Name and email are now verified. You can book the appointment, send messages or subscribe for the next 20 minutes.",
 "✓ പേരും ഇമെയിലും ഇപ്പോൾ സ്ഥിരീകരിച്ചു. അടുത്ത 20 മിനിറ്റ് നേരത്തേക്ക് നിങ്ങൾക്ക് അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യാനും സന്ദേശങ്ങൾ അയയ്ക്കാനും വരിക്കാരാകാനും കഴിയും.",
 "✓ आपका नाम और ईमेल अब सत्यापित हो गए हैं। अगले 20 मिनट तक आप अपॉइंटमेंट बुक कर सकते हैं, संदेश भेज सकते हैं या सदस्यता ले सकते हैं।",
 "✓ Votre nom et votre adresse e-mail sont maintenant vérifiés. Pendant les 20 prochaines minutes, vous pouvez prendre rendez-vous, envoyer des messages ou vous abonner.",
 "✓ Name und E-Mail-Adresse sind nun bestätigt. In den nächsten 20 Minuten können Sie einen Termin buchen, Nachrichten senden oder abonnieren.",
 "✓ تم التحقق من الاسم والبريد الإلكتروني. يمكنك خلال الدقائق العشرين القادمة حجز موعد أو إرسال رسائل أو الاشتراك.",
 "✓ Su nombre y su correo ya están verificados. Durante los próximos 20 minutos puede reservar una cita, enviar mensajes o suscribirse.",
 "✓ 姓名和邮箱已验证。未来 20 分钟内，您可以预约、发送留言或订阅。", "✓ お名前とメールアドレスの確認が完了しました。今後20分間は、予約、メッセージの送信、購読ができます。",
 "✓ Seu nome e e-mail foram verificados. Pelos próximos 20 minutos, você pode agendar um horário, enviar mensagens ou assinar.",
 "✓ Namn och e-postadress är nu verifierade. Under de närmaste 20 minuterna kan du boka en tid, skicka meddelanden eller prenumerera.")
addm("Your appointment request has been forwarded to Anandu. He will get back to you via email. Thank you!",
 "നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് അഭ്യർത്ഥന ആനന്ദുവിന് കൈമാറി. അദ്ദേഹം ഇമെയിൽ വഴി മറുപടി നൽകും. നന്ദി!", "आपका अपॉइंटमेंट अनुरोध आनंदु को भेज दिया गया है। वे ईमेल द्वारा आपसे संपर्क करेंगे। धन्यवाद!",
 "Votre demande de rendez-vous a été transmise à Anandu. Il vous répondra par e-mail. Merci !", "Ihre Terminanfrage wurde an Anandu weitergeleitet. Er meldet sich per E-Mail bei Ihnen. Vielen Dank!",
 "تم تحويل طلب الموعد الخاص بك إلى أنندو. سيرد عليك عبر البريد الإلكتروني. شكرًا لك!", "Su solicitud de cita se ha enviado a Anandu. Él le responderá por correo electrónico. ¡Gracias!",
 "您的预约申请已转交给 Anandu，他会通过电子邮件回复您。谢谢！", "ご予約のリクエストを Anandu に転送しました。メールでご返信いたします。ありがとうございます。",
 "Sua solicitação de horário foi encaminhada ao Anandu. Ele responderá por e-mail. Obrigado!", "Din begäran om tid har vidarebefordrats till Anandu. Han återkommer via e-post. Tack!")
addm("Your message has been forwarded to Anandu. A copy of what you sent has been emailed to you, and he will get back to you soon. Thank you!",
 "നിങ്ങളുടെ സന്ദേശം ആനന്ദുവിന് കൈമാറി. നിങ്ങൾ അയച്ചതിന്റെ ഒരു പകർപ്പ് നിങ്ങൾക്ക് ഇമെയിൽ ചെയ്തിട്ടുണ്ട്, അദ്ദേഹം ഉടൻ മറുപടി നൽകും. നന്ദി!",
 "आपका संदेश आनंदु को भेज दिया गया है। आपके भेजे संदेश की एक प्रति आपको ईमेल कर दी गई है, और वे जल्द ही आपसे संपर्क करेंगे। धन्यवाद!",
 "Votre message a été transmis à Anandu. Une copie de ce que vous avez envoyé vous a été adressée par e-mail, et il vous répondra prochainement. Merci !",
 "Ihre Nachricht wurde an Anandu weitergeleitet. Eine Kopie Ihrer Nachricht wurde Ihnen per E-Mail zugesandt; er meldet sich bald bei Ihnen. Vielen Dank!",
 "تم تحويل رسالتك إلى أنندو. أُرسلت إليك نسخة مما أرسلته عبر البريد الإلكتروني، وسيرد عليك قريبًا. شكرًا لك!",
 "Su mensaje se ha enviado a Anandu. Se le ha remitido por correo electrónico una copia de lo que envió, y él le responderá pronto. ¡Gracias!",
 "您的留言已转交给 Anandu，您所发送内容的副本已通过电子邮件发给您，他会尽快回复。谢谢！", "メッセージを Anandu に転送しました。送信内容の控えをメールでお送りしましたので、ご確認ください。まもなくご返信いたします。ありがとうございます。",
 "Sua mensagem foi encaminhada ao Anandu. Uma cópia do que você enviou foi enviada por e-mail para você, e ele responderá em breve. Obrigado!",
 "Ditt meddelande har vidarebefordrats till Anandu. En kopia av det du skickade har mejlats till dig, och han återkommer snart. Tack!")
addm("Choose a day", "ഒരു ദിവസം തിരഞ്ഞെടുക്കുക", "एक दिन चुनें", "Choisir un jour", "Tag auswählen", "اختر يومًا", "Elegir un día", "选择日期", "日付を選択", "Escolher um dia", "Välj en dag")
addm("Next month", "അടുത്ത മാസം", "अगला महीना", "Mois suivant", "Nächster Monat", "الشهر التالي", "Mes siguiente", "下个月", "翌月", "Mês seguinte", "Nästa månad")
addm("Previous month", "മുൻ മാസം", "पिछला महीना", "Mois précédent", "Vorheriger Monat", "الشهر السابق", "Mes anterior", "上个月", "前月", "Mês anterior", "Föregående månad")
addm("Next photo", "അടുത്ത ഫോട്ടോ", "अगला फ़ोटो", "Photo suivante", "Nächstes Foto", "الصورة التالية", "Foto siguiente", "下一张照片", "次の写真", "Próxima foto", "Nästa foto")
addm("Previous photo", "മുൻ ഫോട്ടോ", "पिछला फ़ोटो", "Photo précédente", "Vorheriges Foto", "الصورة السابقة", "Foto anterior", "上一张照片", "前の写真", "Foto anterior", "Föregående foto")
addm("Like this photo", "ഈ ഫോട്ടോ ഇഷ്ടപ്പെട്ടു", "इस फ़ोटो को पसंद करें", "Aimer cette photo", "Dieses Foto mit „Gefällt mir“ markieren", "الإعجاب بهذه الصورة", "Me gusta esta foto", "喜欢这张照片", "この写真に「いいね」する", "Curtir esta foto", "Gilla det här fotot")
addm("Pause slideshow", "സ്ലൈഡ്ഷോ താൽക്കാലികമായി നിർത്തുക", "स्लाइडशो रोकें", "Mettre le diaporama en pause", "Diashow anhalten", "إيقاف عرض الشرائح مؤقتًا", "Pausar la presentación", "暂停幻灯片", "スライドショーを一時停止", "Pausar a apresentação", "Pausa bildspelet")
addm("Play slideshow", "സ്ലൈഡ്ഷോ ആരംഭിക്കുക", "स्लाइडशो चलाएँ", "Lancer le diaporama", "Diashow starten", "تشغيل عرض الشرائح", "Iniciar la presentación", "播放幻灯片", "スライドショーを再生", "Iniciar a apresentação", "Spela upp bildspelet")
addm("Portrait", "ഛായാചിത്രം", "चित्र", "Portrait", "Porträt", "صورة شخصية", "Retrato", "肖像照", "ポートレート", "Retrato", "Porträtt")
addm("Loading photos", "ഫോട്ടോകൾ ലോഡ് ചെയ്യുന്നു", "फ़ोटो लोड हो रहे हैं", "Chargement des photos", "Fotos werden geladen", "جارٍ تحميل الصور", "Cargando fotos", "正在加载照片", "写真を読み込んでいます", "Carregando fotos", "Läser in foton")
addm("Full screen", "പൂർണ്ണ സ്ക്രീൻ", "पूर्ण स्क्रीन", "Plein écran", "Vollbild", "ملء الشاشة", "Pantalla completa", "全屏", "全画面", "Tela cheia", "Helskärm")
addm("Exit full screen", "പൂർണ്ണ സ്ക്രീനിൽ നിന്ന് പുറത്തുകടക്കുക", "पूर्ण स्क्रीन से बाहर निकलें", "Quitter le plein écran", "Vollbild beenden", "الخروج من ملء الشاشة", "Salir de pantalla completa", "退出全屏", "全画面を終了", "Sair da tela cheia", "Avsluta helskärm")
addm("Switch theme", "തീം മാറ്റുക", "थीम बदलें", "Changer de thème", "Design wechseln", "تبديل المظهر", "Cambiar de tema", "切换主题", "テーマを切り替え", "Alternar tema", "Byt tema")
addm("Voice assistant", "വോയ്‌സ് അസിസ്റ്റന്റ്", "वॉइस असिस्टेंट", "Assistant vocal", "Sprachassistent", "المساعد الصوتي", "Asistente de voz", "语音助手", "音声アシスタント", "Assistente de voz", "Röstassistent")
addm("Pause voice assistant", "വോയ്‌സ് അസിസ്റ്റന്റ് താൽക്കാലികമായി നിർത്തുക", "वॉइस असिस्टेंट रोकें", "Mettre l'assistant vocal en pause", "Sprachassistent anhalten", "إيقاف المساعد الصوتي مؤقتًا", "Pausar el asistente de voz", "暂停语音助手", "音声アシスタントを一時停止", "Pausar o assistente de voz", "Pausa röstassistenten")
addm("Resume voice assistant", "വോയ്‌സ് അസിസ്റ്റന്റ് തുടരുക", "वॉइस असिस्टेंट फिर से शुरू करें", "Reprendre l'assistant vocal", "Sprachassistent fortsetzen", "استئناف المساعد الصوتي", "Reanudar el asistente de voz", "继续语音助手", "音声アシスタントを再開", "Retomar o assistente de voz", "Återuppta röstassistenten")
addm("Already in English", "ഇതിനകം ഇംഗ്ലീഷിലാണ്", "पहले से अंग्रेज़ी में है", "Déjà en anglais", "Bereits auf Englisch", "الموقع بالإنجليزية بالفعل", "Ya está en inglés", "已是英语", "すでに英語です", "Já está em inglês", "Redan på engelska")
addm("Last Updated", "അവസാനം പുതുക്കിയത്", "अंतिम अद्यतन", "Dernière mise à jour", "Zuletzt aktualisiert", "آخر تحديث", "Última actualización", "最后更新", "最終更新", "Última atualização", "Senast uppdaterad")
addm("Time", "സമയം", "समय", "Heure", "Uhrzeit", "الوقت", "Hora", "时间", "時刻", "Hora", "Tid")
addm("Welcome to my website", "എന്റെ വെബ്സൈറ്റിലേക്ക് സ്വാഗതം", "मेरी वेबसाइट में आपका स्वागत है", "Bienvenue sur mon site", "Willkommen auf meiner Website", "مرحبًا بكم في موقعي", "Bienvenido a mi sitio web", "欢迎访问我的网站", "私のウェブサイトへようこそ", "Bem-vindo ao meu site", "Välkommen till min webbplats")
addm("Voice started. Press L to change language and R to reset to English.", "വോയ്‌സ് ആരംഭിച്ചു. ഭാഷ മാറ്റാൻ L അമർത്തുക, ഇംഗ്ലീഷിലേക്ക് മടങ്ങാൻ R അമർത്തുക.", "वॉइस शुरू हो गई। भाषा बदलने के लिए L और अंग्रेज़ी पर लौटने के लिए R दबाएँ।",
 "Voix activée. Appuyez sur L pour changer de langue et sur R pour revenir à l'anglais.", "Sprachausgabe gestartet. Mit L wechseln Sie die Sprache, mit R setzen Sie sie auf Englisch zurück.",
 "بدأ الصوت. اضغط L لتغيير اللغة وR للعودة إلى الإنجليزية.", "Voz activada. Pulse L para cambiar de idioma y R para volver al inglés.", "语音已开启。按 L 切换语言，按 R 恢复为英语。", "音声を開始しました。L キーで言語を切り替え、R キーで英語に戻せます。",
 "Voz ativada. Pressione L para mudar o idioma e R para voltar ao inglês.", "Rösten har startat. Tryck på L för att byta språk och på R för att återgå till engelska.")
