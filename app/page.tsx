'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink), { ssr: false });

Font.register({
  family: 'OlimpiadaFont',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { paddingLeft: 25, paddingRight: 25, fontFamily: 'OlimpiadaFont', position: 'relative' },
  pageBorder: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, border: '2pt solid #1e3a8a', borderRadius: 5, zIndex: -2 },
  headerContainer: { paddingBottom: 10, borderBottom: '1pt solid #000000' },
  logoWrapper: { alignItems: 'center', marginBottom: 5 },
  logo: { objectFit: 'contain' }, 
  headerTexts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5 },
  headerTitle: { fontWeight: 'bold', color: '#1e3a8a' }, 
  headerSub: { fontWeight: 'bold', color: '#ff0707' },   
  wmSingle: { position: 'absolute', width: '100%', textAlign: 'center', zIndex: -1, transform: 'rotate(-45deg)' },
  wmGridContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' },
  wmGridRow: { display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' },
  wmGridText: { color: '#000000', fontWeight: 'bold', transform: 'rotate(-45deg)' },
  questionBlock: { flexDirection: 'row' },
  qNumber: { fontWeight: 'bold' },
  texts: { flex: 1 },
  qImage: { objectFit: 'contain' },
  footerContact: { borderTop: '1pt dashed #1e3a8a', alignItems: 'center' },
  footerText: { fontWeight: 'bold', color: '#1e3a8a' }
});

interface Option { en: string; az: string; ru: string; }
interface Question { 
  en: string; az: string; ru: string; 
  options: Option[]; isTranslating?: boolean; layout: 'row' | 'column'; 
  image?: string; imageWidth?: number; imagePosition?: string;
}

const LatexText = ({ text, style, scale }: { text: string, style: any, scale: number }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g).filter(Boolean);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', width: '100%', marginBottom: style.marginBottom || 0 }}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg{white}${encodeURIComponent(math)}`;
          return (
            <View key={index} style={{ width: '100%', alignItems: 'center', marginVertical: 6 * scale }}>
              <Image src={url} style={{ height: 22 * scale }} />
            </View>
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg{white}${encodeURIComponent(math)}`;
          return <Image key={index} src={url} style={{ height: 12 * scale, marginHorizontal: 3 }} />;
        } else {
          const words = part.split(' ');
          return words.map((word, wIndex) => (
            <Text key={`${index}-${wIndex}`} style={[{ ...style, marginBottom: 0 }]}>
              {word}{wIndex < words.length - 1 ? ' ' : ''}
            </Text>
          ));
        }
      })}
    </View>
  );
};

const MyDocument = ({ questions, watermark, opacity, wmMode, wmX, wmY, wmRows, wmCols, headerTitle, headerSubtitle, logoUrl, contactPhone, contactInsta, questionsPerPage, customScale, orientation }: any) => {
  const scale = questionsPerPage === 1 ? customScale : 1; 

  const chunks = questionsPerPage === 0 
    ? [questions] 
    : questions.reduce((acc: any[], curr: any, i: number) => {
        const index = Math.floor(i / questionsPerPage);
        if (!acc[index]) acc[index] = [];
        acc[index].push({ ...curr, realIndex: i }); 
        return acc;
      }, []);

  return (
    <Document>
      {chunks.map((chunkQuestions: any[], pageIndex: number) => (
        <Page key={pageIndex} size="A4" orientation={orientation} style={[styles.page, { paddingTop: 25 * scale, paddingBottom: 25 * scale }]}>
          <View fixed style={styles.pageBorder} />

          {watermark && wmMode === 'single' && (
            <View fixed style={[styles.wmSingle, { opacity: opacity, top: `${wmY}%`, left: `${wmX - 50}%` }]}>
              <Text style={{ fontSize: 60, color: '#000', fontWeight: 'bold' }}>{watermark}</Text>
            </View>
          )}

          {watermark && wmMode === 'grid' && (
            <View fixed style={[styles.wmGridContainer, { opacity: opacity }]}>
              {Array.from({ length: wmRows }).map((_, rIndex) => (
                <View key={`r-${rIndex}`} style={styles.wmGridRow}>
                  {Array.from({ length: wmCols }).map((_, cIndex) => (
                    <Text key={`c-${cIndex}`} style={[styles.wmGridText, { fontSize: 35 }]}>{watermark}</Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View fixed style={[styles.headerContainer, { marginBottom: 15 * scale }]}>
            {logoUrl && logoUrl.trim() !== '' && (
              <View style={styles.logoWrapper}>
                <Image src={logoUrl} style={[styles.logo, { width: 250 * scale, height: 100 * scale }]} />
              </View>
            )}
            
            <View style={styles.headerTexts}>
              <Text style={[styles.headerTitle, { fontSize: 14 * scale }]}>{headerTitle}</Text>
              <Text style={[styles.headerSub, { fontSize: 14 * scale }]}>{headerSubtitle}</Text>
            </View>
          </View>

          {chunkQuestions.map((q: any, index: number) => {
            const actualIndex = questionsPerPage === 0 ? index : q.realIndex;
            const isRow = q.layout === 'row';
            return (
              <View key={actualIndex} style={[styles.questionBlock, { marginBottom: 20 * scale }]} wrap={false}>
                <Text style={[styles.qNumber, { width: 25 * scale, fontSize: 12 * scale }]}>{actualIndex + 1})</Text>
                <View style={styles.texts}>
                  {q.en && <LatexText text={q.en} style={{ color: '#000', fontSize: 12 * scale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 12 * scale }} scale={scale} />}
                  {q.az && <LatexText text={q.az} style={{ color: '#333', fontSize: 12 * scale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 12 * scale }} scale={scale} />}
                  {q.ru && <LatexText text={q.ru} style={{ color: '#555', fontSize: 12 * scale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 16 * scale }} scale={scale} />}
                  
                  {q.image && <Image src={q.image} style={[styles.qImage, { width: q.imageWidth || 200, alignSelf: q.imagePosition || 'center', marginBottom: 15 * scale, marginTop: 10 * scale }]} />}

                  <View style={{ marginTop: 5 * scale, flexDirection: isRow ? 'row' : 'column', flexWrap: 'wrap', width: '100%' }}>
                    {q.options.map((opt: any, oIndex: number) => (
                      <View key={oIndex} style={[{ marginBottom: 4 * scale }, isRow ? { flex: 1, paddingRight: 5 * scale } : { marginLeft: 10 * scale }]}>
                        {opt.en && (
                          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 2 * scale }}>
                            <Text style={{ color: '#000', fontSize: 11 * scale, marginRight: 4 * scale, fontWeight: 'bold' }}>{String.fromCharCode(65 + oIndex)})</Text>
                            <View style={{ flex: 1 }}><LatexText text={opt.en} style={{ color: '#000', fontSize: 11 * scale, fontWeight: 'bold' }} scale={scale} /></View>
                          </View>
                        )}
                        {opt.az && (
                          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 2 * scale, marginLeft: isRow ? 0 : 15 * scale }}>
                            <View style={{ flex: 1 }}><LatexText text={opt.az} style={{ color: '#333', fontSize: 11 * scale, fontWeight: 'bold' }} scale={scale} /></View>
                          </View>
                        )}
                        {opt.ru && (
                          <View style={{ flexDirection: 'row', width: '100%', marginLeft: isRow ? 0 : 15 * scale }}>
                            <View style={{ flex: 1 }}><LatexText text={opt.ru} style={{ color: '#555', fontSize: 11 * scale, fontWeight: 'bold' }} scale={scale} /></View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}

          {pageIndex === chunks.length - 1 && (contactPhone || contactInsta) && (
            <View style={[styles.footerContact, { marginTop: 30 * scale, paddingTop: 15 * scale }]} wrap={false}>
              {contactPhone && <Text style={[styles.footerText, { fontSize: 12 * scale, marginBottom: 5 * scale }]}> Əlaqə nömrəsi: {contactPhone}</Text>}
              {contactInsta && <Text style={[styles.footerText, { fontSize: 12 * scale, marginBottom: 5 * scale }]}> Instagram: {contactInsta}</Text>}
            </View>
          )}
        </Page>
      ))}
    </Document>
  );
};

const LOCAL_STORAGE_KEY = 'pdf_generator_saved_state';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null); // JSON yükləmək üçün
  
  // Default dəyərlər
  const defaultQuestion: Question = { 
    en: '', az: '', ru: '', 
    options: [{ en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }], 
    isTranslating: false, layout: 'row', imageWidth: 200, imagePosition: 'center'
  };

  const [logoUrl, setLogoUrl] = useState('https://www.moc.com.az/_next/image?url=%2Flogo.png&w=384&q=75');
  const [headerTitle, setHeaderTitle] = useState('TIMO SINAQ IMTAHANI');
  const [headerSubtitle, setHeaderSubtitle] = useState('5-ci Sinif');
  const [contactPhone, setContactPhone] = useState('+994 70 207 37 92');
  const [contactInsta, setContactInsta] = useState('@main_olympic_center');
  const [wmText, setWmText] = useState('@desttex');
  const [wmOpacity, setWmOpacity] = useState(0.03);
  const [wmMode, setWmMode] = useState<'single'|'grid'>('grid');
  const [wmX, setWmX] = useState(50);
  const [wmY, setWmY] = useState(40);
  const [wmRows, setWmRows] = useState(4);
  const [wmCols, setWmCols] = useState(3);
  const [questionsPerPage, setQuestionsPerPage] = useState<number>(0); 
  const [customScale, setCustomScale] = useState<number>(1.25);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion]);
  const [pdfSnapshot, setPdfSnapshot] = useState<any>(null);

  // ✨ 1. YADDAŞDAN OXUMA (Səhifə yüklənəndə)
  useEffect(() => { 
    setIsClient(true); 
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.questions) setQuestions(parsed.questions);
        if (parsed.logoUrl !== undefined) setLogoUrl(parsed.logoUrl);
        if (parsed.headerTitle !== undefined) setHeaderTitle(parsed.headerTitle);
        if (parsed.headerSubtitle !== undefined) setHeaderSubtitle(parsed.headerSubtitle);
        if (parsed.contactPhone !== undefined) setContactPhone(parsed.contactPhone);
        if (parsed.contactInsta !== undefined) setContactInsta(parsed.contactInsta);
        if (parsed.wmText !== undefined) setWmText(parsed.wmText);
        if (parsed.wmOpacity !== undefined) setWmOpacity(parsed.wmOpacity);
        if (parsed.wmMode !== undefined) setWmMode(parsed.wmMode);
        if (parsed.wmX !== undefined) setWmX(parsed.wmX);
        if (parsed.wmY !== undefined) setWmY(parsed.wmY);
        if (parsed.wmRows !== undefined) setWmRows(parsed.wmRows);
        if (parsed.wmCols !== undefined) setWmCols(parsed.wmCols);
        if (parsed.questionsPerPage !== undefined) setQuestionsPerPage(parsed.questionsPerPage);
        if (parsed.customScale !== undefined) setCustomScale(parsed.customScale);
        if (parsed.orientation !== undefined) setOrientation(parsed.orientation);
      } catch (e) {
        console.error("Yaddaş oxunarkən xəta", e);
      }
    }
  }, []);

  // ✨ 2. AVTOMATİK YADDAŞA YAZMA (Hər dəyişiklikdə)
  useEffect(() => {
    if (isClient) {
      const stateToSave = {
        questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
        wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, customScale, orientation
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta, wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, customScale, orientation, isClient]);

  // ✨ 3. LAYİHƏ KİMİ SAXLA (JSON Export)
  const handleExportProject = () => {
    const stateToSave = {
      questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
      wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, customScale, orientation
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToSave));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", (headerTitle || "Imtahan").replace(/\s+/g, '_') + "_Layihe.json");
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  };

  // ✨ 4. LAYİHƏ YÜKLƏ (JSON Import)
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.questions) setQuestions(parsed.questions);
        if (parsed.logoUrl !== undefined) setLogoUrl(parsed.logoUrl);
        if (parsed.headerTitle !== undefined) setHeaderTitle(parsed.headerTitle);
        if (parsed.headerSubtitle !== undefined) setHeaderSubtitle(parsed.headerSubtitle);
        if (parsed.contactPhone !== undefined) setContactPhone(parsed.contactPhone);
        if (parsed.contactInsta !== undefined) setContactInsta(parsed.contactInsta);
        if (parsed.wmText !== undefined) setWmText(parsed.wmText);
        if (parsed.wmOpacity !== undefined) setWmOpacity(parsed.wmOpacity);
        if (parsed.wmMode !== undefined) setWmMode(parsed.wmMode);
        if (parsed.wmX !== undefined) setWmX(parsed.wmX);
        if (parsed.wmY !== undefined) setWmY(parsed.wmY);
        if (parsed.wmRows !== undefined) setWmRows(parsed.wmRows);
        if (parsed.wmCols !== undefined) setWmCols(parsed.wmCols);
        if (parsed.questionsPerPage !== undefined) setQuestionsPerPage(parsed.questionsPerPage);
        if (parsed.customScale !== undefined) setCustomScale(parsed.customScale);
        if (parsed.orientation !== undefined) setOrientation(parsed.orientation);
        setPdfSnapshot(null);
        alert("✅ Layihə uğurla yükləndi!");
      } catch (error) {
        alert("❌ Fayl oxunarkən xəta baş verdi. Düzgün JSON layihə faylı olduğuna əmin olun.");
      }
    };
    reader.readAsText(file);
    if (projectInputRef.current) projectInputRef.current.value = '';
  };

  // ✨ 5. SIFIRLA (LocalStorage-i sil)
  const handleReset = () => {
    if (window.confirm("Bütün məlumatlar silinəcək və sıfırlanacaq. Əminsiniz?")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.location.reload(); // Səhifəni sıfırdan yüklə
    }
  };

  const handleGeneratePDF = () => {
    setPdfSnapshot({
      questions: JSON.parse(JSON.stringify(questions)),
      logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
      watermark: wmText,
      opacity: wmOpacity, 
      wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, customScale, orientation
    });
  };

  const addQuestion = () => { setQuestions([...questions, defaultQuestion]); setPdfSnapshot(null); };

  const hasOnlyMathsOrNumbers = (text: string) => !/[a-zA-Zа-яА-ЯəöğıüçşƏÖĞIÜÇŞ]/i.test(text);

  const updateQuestion = (index: number, field: keyof Question, value: any) => { 
    const newQs = [...questions]; 
    const prevValue = newQs[index][field as keyof Question]; 
    
    newQs[index] = { ...newQs[index], [field]: value }; 

    if (['en', 'az', 'ru'].includes(field as string) && typeof value === 'string') {
      if (value.trim() !== '' && hasOnlyMathsOrNumbers(value)) {
        if (field !== 'en' && (newQs[index].en === '' || newQs[index].en === prevValue)) newQs[index].en = value;
        if (field !== 'az' && (newQs[index].az === '' || newQs[index].az === prevValue)) newQs[index].az = value;
        if (field !== 'ru' && (newQs[index].ru === '' || newQs[index].ru === prevValue)) newQs[index].ru = value;
      }
    }

    setQuestions(newQs); 
    setPdfSnapshot(null); 
  };

  const updateOption = (qIndex: number, optIndex: number, field: keyof Option, value: string) => { 
    const newQs = [...questions]; 
    const currentOpt = newQs[qIndex].options[optIndex];
    const prevValue = currentOpt[field]; 

    currentOpt[field] = value; 

    if (value.trim() !== '' && hasOnlyMathsOrNumbers(value)) {
      if (field !== 'en' && (currentOpt.en === '' || currentOpt.en === prevValue)) currentOpt.en = value;
      if (field !== 'az' && (currentOpt.az === '' || currentOpt.az === prevValue)) currentOpt.az = value;
      if (field !== 'ru' && (currentOpt.ru === '' || currentOpt.ru === prevValue)) currentOpt.ru = value;
    }

    setQuestions(newQs); 
    setPdfSnapshot(null); 
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestions(prevQs => {
          const newQs = [...prevQs];
          newQs[index] = { ...newQs[index], image: reader.result as string, imageWidth: 200, imagePosition: 'center' };
          return newQs;
        });
        setPdfSnapshot(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.questions && data.questions.length > 0) {
        const extractedQuestions = data.questions.map((extQ: any) => {
          const lang = extQ.language || 'az'; 
          const isEn = lang === 'en';
          const isAz = lang === 'az';
          const isRu = lang === 'ru';

          return {
            ...defaultQuestion,
            en: isEn ? extQ.text : '',
            az: isAz ? extQ.text : '',
            ru: isRu ? extQ.text : '',
            options: [0, 1, 2, 3].map((i) => ({
              en: isEn ? (extQ.options[i] || '') : '',
              az: isAz ? (extQ.options[i] || '') : '',
              ru: isRu ? (extQ.options[i] || '') : '',
            }))
          };
        });

        // Yeni tapılmış sualları mövcud olanların sonuna əlavə edirik, yoxsa hamısını silir? 
        // Yaxşısı budur silib yerinə yazsın, və ya istəsən gələcəkdə "concat" edərik.
        setQuestions(extractedQuestions);
        setPdfSnapshot(null); 
        alert(`✅ ${extractedQuestions.length} sual uğurla çıxarıldı! İndi yoxlayıb 'Toplu Tərcümə' edə bilərsən.`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ PDF analiz edilərkən xəta baş verdi. Server API-ni yoxla.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isFullyTranslated = (q: Question) => 
    q.en.trim() !== '' && q.az.trim() !== '' && q.ru.trim() !== '' &&
    q.options.every(opt => opt.en.trim() !== '' && opt.az.trim() !== '' && opt.ru.trim() !== '');

  const translateSingle = async (index: number) => {
    const q = questions[index];

    if (!q.en.trim() && !q.az.trim() && !q.ru.trim()) {
      return alert("Tərcümə etmək üçün ən azı bir dildə şərt yazın!");
    }

    if (isFullyTranslated(q)) {
      return alert("Bu sual artıq 3 dildə də doldurulub.");
    }
    
    updateQuestion(index, 'isTranslating', true);
    
    try {
      const itemsToSend = [{ 
        en: { text: q.en, options: q.options.map((o: any) => o.en) },
        az: { text: q.az, options: q.options.map((o: any) => o.az) },
        ru: { text: q.ru, options: q.options.map((o: any) => o.ru) }
      }];

      const response = await fetch('/api/translate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ items: itemsToSend }) 
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const translated = data[0];
      
      if (translated) {
        setQuestions(prevQuestions => {
          const newQuestions = [...prevQuestions];
          const targetQ = { ...newQuestions[index] };
          
          targetQ.en = translated.en?.text || targetQ.en;
          targetQ.az = translated.az?.text || targetQ.az;
          targetQ.ru = translated.ru?.text || targetQ.ru;
          
          targetQ.options = targetQ.options.map((opt, oIndex) => ({
            en: translated.en?.options?.[oIndex] || opt.en,
            az: translated.az?.options?.[oIndex] || opt.az,
            ru: translated.ru?.options?.[oIndex] || opt.ru,
          }));
          
          targetQ.isTranslating = false;
          newQuestions[index] = targetQ;
          return newQuestions;
        });
        setPdfSnapshot(null);
      }
    } catch (error) { 
      alert(`Sual ${index + 1} tərcümə olunmadı.`); 
      updateQuestion(index, 'isTranslating', false); 
    } 
  };

  const translateAll = async () => {
    setIsTranslatingAll(true);
    try {
      const itemsToSend: any[] = [];
      const indexMap: number[] = [];

      questions.forEach((q: any, i: number) => {
        if (!q.en.trim() && !q.az.trim() && !q.ru.trim()) return; 

        if (!isFullyTranslated(q)) {
          itemsToSend.push({ 
            en: { text: q.en, options: q.options.map((o: any) => o.en) },
            az: { text: q.az, options: q.options.map((o: any) => o.az) },
            ru: { text: q.ru, options: q.options.map((o: any) => o.ru) }
          });
          indexMap.push(i); 
        }
      });

      if (itemsToSend.length === 0) {
        setIsTranslatingAll(false);
        return;
      }

      const response = await fetch('/api/translate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ items: itemsToSend }) 
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setQuestions(prevQuestions => {
        const newQuestions = [...prevQuestions];
        
        indexMap.forEach((originalIndex, mappedIndex) => {
          const translated = data[mappedIndex];
          if (translated) {
            const targetQ = { ...newQuestions[originalIndex] };
            
            targetQ.en = translated.en?.text || targetQ.en;
            targetQ.az = translated.az?.text || targetQ.az;
            targetQ.ru = translated.ru?.text || targetQ.ru;
            
            targetQ.options = targetQ.options.map((opt, oIndex) => ({
              en: translated.en?.options?.[oIndex] || opt.en,
              az: translated.az?.options?.[oIndex] || opt.az,
              ru: translated.ru?.options?.[oIndex] || opt.ru,
            }));
            
            newQuestions[originalIndex] = targetQ;
          }
        });
        
        return newQuestions;
      });

      setPdfSnapshot(null);
    } catch (error) { 
      alert('Toplu tərcümə xətası.'); 
    } finally { 
      setIsTranslatingAll(false); 
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gray-100 text-black p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* YUXARI İDARƏ PANELİ - 2 SƏTİRƏ BÖLÜNDÜ Kİ SIĞSIN */}
        <div className="bg-white p-4 rounded-lg shadow border sticky top-0 z-20 mb-6">
          <div className="flex justify-between items-center mb-3 border-b pb-3">
            <h1 className="text-2xl font-bold text-blue-900">PDF Generator</h1>
            
            {/* LAYİHƏ İDARƏSİ (SAVE/LOAD/RESET) */}
            <div className="flex gap-2">
              <button onClick={handleReset} className="bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 px-3 py-1.5 rounded text-sm font-bold transition border">
                🗑️ Sıfırla
              </button>
              
              <button onClick={handleExportProject} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-bold transition border">
                💾 Layihəni Saxla
              </button>
              
              <input type="file" accept=".json" onChange={handleImportProject} ref={projectInputRef} className="hidden" />
              <button onClick={() => projectInputRef.current?.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-bold transition border">
                📂 Layihə Yüklə
              </button>
            </div>
          </div>

          {/* ƏSAS ƏMƏLİYYATLAR (PDF/TƏRCÜMƏ) */}
          <div className="flex justify-end gap-3">
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} ref={fileInputRef} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isExtracting} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold transition shadow-md disabled:opacity-50">
              {isExtracting ? '⏳ Oxunur...' : '📄 PDF-dən Çıxar'}
            </button>

            <button onClick={translateAll} disabled={isTranslatingAll} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold transition shadow-md disabled:opacity-50">
              {isTranslatingAll ? '⏳ Gözləyin...' : '⚡ Toplu Tərcümə'}
            </button>
            
            <button onClick={handleGeneratePDF} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold transition shadow-md">
              ⚙️ PDF-i Hazırla
            </button>
            
            {pdfSnapshot && (
               <PDFDownloadLink document={<MyDocument {...pdfSnapshot} />} fileName="Olimpiada_Testi.pdf" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-bold shadow transition animate-pulse">
                 {({ loading }) => (loading ? 'Yüklənir...' : '📥 İndi Yüklə')}
               </PDFDownloadLink>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm mb-6 border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">🎨 Sənəd və Dizayn</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
             <div>
                <label className="text-xs font-bold text-blue-700 block mb-1">📄 Səhifə Formatı</label>
                <select value={orientation} onChange={(e: any) => { setOrientation(e.target.value); setPdfSnapshot(null); }} className="w-full border p-2 rounded text-sm bg-white font-bold text-blue-900 cursor-pointer">
                   <option value="portrait">📏 Portrait (Şaquli - Adi vərəq)</option>
                   <option value="landscape">📐 Landscape (Üfüqi)</option>
                </select>
             </div>
             
             <div>
                <label className="text-xs font-bold text-blue-700 block mb-1">🖼️ Loqo URL (Hər səhifənin yuxarısında)</label>
                <input type="text" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setPdfSnapshot(null); }} placeholder="https://domain.com/logo.png" className="w-full border p-2 rounded text-sm bg-white" />
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
             <div>
                <label className="text-xs font-bold text-blue-700 block mb-1">📄 Səhifədə Sual Sayı</label>
                <select value={questionsPerPage} onChange={(e) => { setQuestionsPerPage(Number(e.target.value)); setPdfSnapshot(null); }} className="w-full border p-2 rounded text-sm bg-white font-bold text-blue-900 cursor-pointer">
                   <option value={0}>Avtomatik (Sığdığı qədər)</option>
                   <option value={1}>Hər səhifədə 1 sual (Şriftlər böyüyür)</option>
                   <option value={2}>Hər səhifədə 2 sual</option>
                   <option value={3}>Hər səhifədə 3 sual</option>
                   <option value={4}>Hər səhifədə 4 sual</option>
                </select>

                {questionsPerPage === 1 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <label className="text-[11px] font-bold text-yellow-800 block mb-1">
                      🔍 Sualın Miqyası: {customScale}x 
                      <span className="font-normal text-gray-500 ml-1">(Sığmırsa, sola çək)</span>
                    </label>
                    <input 
                      type="range" min="0.8" max="1.8" step="0.05" 
                      value={customScale} 
                      onChange={(e) => { setCustomScale(parseFloat(e.target.value)); setPdfSnapshot(null); }} 
                      className="w-full cursor-pointer accent-yellow-600" 
                    />
                  </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 font-bold">Solda Yazılacaq Mətn (İmtahan Adı)</label>
              <input type="text" value={headerTitle} onChange={(e) => { setHeaderTitle(e.target.value); setPdfSnapshot(null); }} placeholder="Məs: Riyaziyyat Olimpiadası" className="w-full border p-2 rounded mt-1 bg-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold">Sağda Yazılacaq Mətn (Sinif / Kateqoriya)</label>
              <input type="text" value={headerSubtitle} onChange={(e) => { setHeaderSubtitle(e.target.value); setPdfSnapshot(null); }} placeholder="Məs: 5-ci Sinif" className="w-full border p-2 rounded mt-1 bg-white text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
            <div><label className="text-xs font-bold text-blue-700">📞 Əlaqə Nömrəsi</label><input type="text" value={contactPhone} onChange={(e) => { setContactPhone(e.target.value); setPdfSnapshot(null); }} className="w-full border p-2 rounded mt-1 bg-white text-sm" /></div>
            <div><label className="text-xs font-bold text-blue-700">📱 Instagram</label><input type="text" value={contactInsta} onChange={(e) => { setContactInsta(e.target.value); setPdfSnapshot(null); }} className="w-full border p-2 rounded mt-1 bg-white text-sm" /></div>
          </div>

          <div className="flex items-center gap-4 mb-3 border-t pt-3">
            <div className="flex-1"><label className="text-xs text-gray-500">Watermark</label><input type="text" value={wmText} onChange={(e) => { setWmText(e.target.value); setPdfSnapshot(null); }} className="w-full border p-2 rounded mt-1 text-sm" /></div>
            <div className="flex-1"><label className="text-xs text-gray-500">Şəffaflıq: {Math.round(wmOpacity * 100)}%</label><input type="range" min="0" max="1" step="0.02" value={wmOpacity} onChange={(e) => { setWmOpacity(parseFloat(e.target.value)); setPdfSnapshot(null); }} className="w-full mt-3 cursor-pointer" /></div>
            <div className="w-1/4"><label className="text-xs text-gray-500">Rejim</label>
              <select value={wmMode} onChange={(e: any) => { setWmMode(e.target.value); setPdfSnapshot(null); }} className="w-full border p-2 rounded mt-1 text-sm bg-white">
                <option value="grid">Çoxlu (Grid)</option>
                <option value="single">Tək Mərkəzi</option>
              </select>
            </div>
          </div>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="border p-4 mb-5 rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="font-bold text-md text-blue-800">{i + 1}-ci Sual</h3>
              <div className="flex items-center gap-2">
                <label className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-[10px] cursor-pointer font-bold">
                    🖼️ Şəkil Əlavə Et
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, e)} className="hidden" />
                </label>
                {q.image && (
                  <button onClick={() => updateQuestion(i, 'image', undefined)} className="text-red-500 text-[10px] font-bold">Sil</button>
                )}
                
                <select value={q.layout} onChange={(e: any) => updateQuestion(i, 'layout', e.target.value)} className="border border-blue-300 bg-blue-50 text-blue-800 p-1 rounded text-[10px] font-bold outline-none cursor-pointer">
                  <option value="row">▤ Yan-yana</option>
                  <option value="column">☰ Alt-alta</option>
                </select>
                <button onClick={() => translateSingle(i)} disabled={q.isTranslating} className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-[10px] font-bold transition disabled:opacity-50">
                  {q.isTranslating ? '⏳' : '⚡ Tərcümə Et'}
                </button>
              </div>
            </div>
            
            <textarea placeholder="EN şərt... (məs: Əgər $x=5$ olarsa, $$x^2=?$$)" value={q.en} onChange={(e) => updateQuestion(i, 'en', e.target.value)} className="w-full border p-2 rounded h-20 mb-2 bg-blue-50 text-sm" />
            <textarea placeholder="AZ tərcümə..." value={q.az} onChange={(e) => updateQuestion(i, 'az', e.target.value)} className="w-full border p-2 rounded h-20 mb-2 text-sm" />
            <textarea placeholder="RU tərcümə..." value={q.ru} onChange={(e) => updateQuestion(i, 'ru', e.target.value)} className="w-full border p-2 rounded h-20 mb-3 text-sm" />
            
            {q.image && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <img src={q.image} className="max-h-32 mx-auto rounded border mb-3 shadow-sm" alt="Preview" />
                
                <div className="flex items-center gap-4 bg-white p-2 border rounded">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Şəklin Eni (Genişliyi): {q.imageWidth || 200}px</label>
                    <input type="range" min="50" max="500" step="10" value={q.imageWidth || 200} onChange={(e) => updateQuestion(i, 'imageWidth', parseInt(e.target.value))} className="w-full cursor-pointer" />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Şəklin Mövqeyi</label>
                    <select value={q.imagePosition || 'center'} onChange={(e) => updateQuestion(i, 'imagePosition', e.target.value)} className="w-full border border-gray-300 p-1 rounded text-[11px] bg-white outline-none">
                      <option value="flex-start">⬅️ Sola</option>
                      <option value="center">⏺️ Mərkəzə</option>
                      <option value="flex-end">➡️ Sağa</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="pl-3 border-l-4 border-blue-400 bg-gray-50 p-2 rounded">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex gap-2 mb-2 items-center">
                  <span className="font-bold w-5 text-sm">{String.fromCharCode(65 + oIndex)})</span>
                  <input type="text" placeholder="EN ($2^x$)" value={opt.en} onChange={(e) => updateOption(i, oIndex, 'en', e.target.value)} className="border p-1 rounded w-1/3 bg-white text-xs" />
                  <input type="text" placeholder="AZ" value={opt.az} onChange={(e) => updateOption(i, oIndex, 'az', e.target.value)} className="border p-1 rounded w-1/3 text-xs" />
                  <input type="text" placeholder="RU" value={opt.ru} onChange={(e) => updateOption(i, oIndex, 'ru', e.target.value)} className="border p-1 rounded w-1/3 text-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addQuestion} className="w-full bg-white border-2 border-dashed border-blue-400 text-blue-600 font-bold py-4 rounded-lg mt-2 mb-10 shadow-sm transition hover:bg-blue-50">+ Yeni Sual Əlavə Et</button>
      </div>
    </div>
  );
}