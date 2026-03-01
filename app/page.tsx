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
  pageBorder: { position: 'absolute', top: 15, left: 15, right: 15, bottom: 15, border: '4pt dashed #FFC107', borderRadius: 20, zIndex: -2 },
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
  scale?: number; 
}

const cleanAIText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\bdiamondsuit\b/gi, '◊')
    .replace(/\btriangle\b/gi, '△')
    .replace(/\bclubsuit\b/gi, '♣')
    .replace(/\bheartsuit\b/gi, '♥')
    .replace(/\bspadesuit\b/gi, '♠')
    .replace(/\^\{?\\?circ\}?/gi, '°')
    .replace(/(^|[^\\])frac\{([^}]+)\}\{([^}]+)\}/g, '$1$2/$3') 
    .replace(/(^|[^\\])overline\{([^}]+)\}/g, '$1($2)')        
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/(\d+)\s*##/g, '$1 см')
    .replace(/(\d+)\s*#/g, '$1 г')
    .replace(/units\^2/g, 'units²')
    .replace(/units\^3/g, 'units³'); 
};

const LatexText = ({ text, style, scale }: { text: string, style: any, scale: number }) => {
  if (!text) return null;
  
  let cleanText = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') 
    .replace(/[–—−]/g, '-')
    .replace(/\r/g, '');

  const parts = cleanText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\n)/g).filter(p => p !== undefined && p !== null && p !== '');

  const renderElements: any[] = [];

  parts.forEach((part, index) => {
    if (part === '\n') {
      renderElements.push(<View key={`nl-${index}`} style={{ width: '100%', height: 4 * scale }} />);
    } 
    else if (part.startsWith('$')) {
      const isDisplay = part.startsWith('$$');
      let math = part.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1).trim();

      math = math.replace(/\\\\(frac|overline|sum|int|cdot|div|times|alpha|beta|pi|le|ge)/g, '\\$1');

      if (!math) return;

      if (math === '^2' || math === '^{2}') {
        renderElements.push(<Text key={`sq-${index}`} style={[{ ...style, marginBottom: 0 }]}>²</Text>);
        return;
      }
      if (math === '^3' || math === '^{3}') {
        renderElements.push(<Text key={`cb-${index}`} style={[{ ...style, marginBottom: 0 }]}>³</Text>);
        return;
      }
      if (math === '^\\circ' || math === '^{\\circ}' || math === '\\circ') {
        renderElements.push(<Text key={`dg-${index}`} style={[{ ...style, marginBottom: 0 }]}>°</Text>);
        return;
      }

      if (/[а-яА-ЯёЁəƏöÖğĞıİüÜçÇşŞ]/.test(math)) {
        const fallbackMath = math
          .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
          .replace(/\\le/g, '≤').replace(/\\ge/g, '≥').replace(/\\diamondsuit/gi, '◊')
          .replace(/\\triangle/gi, '△').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
          .replace(/\\pi/g, 'π').replace(/\^2/g, '²').replace(/\^3/g, '³')
          .replace(/\^\{?\\?circ\}?/gi, '°').replace(/\\/g, ''); 

        renderElements.push(
          <Text key={`mf-${index}`} style={[{ ...style, marginBottom: 0, marginHorizontal: 3 * scale }]}>
            {fallbackMath}
          </Text>
        );
      } else {
        const safeMathForCodeCogs = math.replace(/°/g, '^\\circ');
        const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg{white}${encodeURIComponent(safeMathForCodeCogs)}`;
        
        let imgHeight = 13 * scale;
        if (isDisplay) {
            imgHeight = 26 * scale;
        } else if (math.includes('\\frac') || math.includes('\\sum') || math.includes('\\int')) {
            imgHeight = 24 * scale; 
        } else if (math.includes('\\overline') || math.includes('^') || math.includes('_')) {
            imgHeight = 16 * scale; 
        }

        if (isDisplay) {
          renderElements.push(
            <View key={`md-${index}`} style={{ width: '100%', alignItems: 'center', marginVertical: 6 * scale }}>
              <Image src={url} style={{ height: imgHeight }} />
            </View>
          );
        } else {
          renderElements.push(
            <Image key={`mi-${index}`} src={url} style={{ height: imgHeight, marginHorizontal: 3 * scale }} />
          );
        }
      }

    } else {
      const subParts = part.split(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\overline\{[^{}]*\})/g).filter(p => p !== undefined && p !== '');

      subParts.forEach((subPart, spIndex) => {
        if (subPart.startsWith('\\frac') || subPart.startsWith('\\overline')) {
          const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg{white}${encodeURIComponent(subPart)}`;
          let imgHeight = subPart.startsWith('\\frac') ? 24 * scale : 16 * scale;
          renderElements.push(<Image key={`subm-${index}-${spIndex}`} src={url} style={{ height: imgHeight, marginHorizontal: 2 * scale }} />);
        } else {
          let normalText = subPart
              .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
              .replace(/\\le/g, '≤').replace(/\\ge/g, '≥')
              .replace(/\\diamondsuit/gi, '◊').replace(/\\clubsuit/gi, '♣')
              .replace(/\\heartsuit/gi, '♥').replace(/\\spadesuit/gi, '♠')
              .replace(/\\triangle/gi, '△').replace(/\^\{?\\?circ\}?/gi, '°')
              .replace(/\\/g, ''); 

          const words = normalText.split(' ');
          words.forEach((word, wIndex) => {
            renderElements.push(
              <Text key={`t-${index}-${spIndex}-${wIndex}`} style={[{ ...style, marginBottom: 0 }]}>
                {word}{wIndex < words.length - 1 ? ' ' : ''}
              </Text>
            );
          });
        }
      });
    }
  });

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', width: '100%', marginBottom: style.marginBottom || 0 }}>
      {renderElements}
    </View>
  );
};

const MyDocument = ({ questions, watermark, opacity, wmMode, wmX, wmY, wmRows, wmCols, headerTitle, headerSubtitle, logoUrl, contactPhone, contactInsta, questionsPerPage, orientation }: any) => {
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
        <Page key={pageIndex} size="A4" orientation={orientation} style={[styles.page, { paddingTop: 25, paddingBottom: 25 }]}>
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

          <View fixed style={[styles.headerContainer, { marginBottom: 15 }]}>
            {logoUrl && logoUrl.trim() !== '' && (
              <View style={styles.logoWrapper}>
                <Image src={logoUrl} style={[styles.logo, { width: 250, height: 100 }]} />
              </View>
            )}
            <View style={styles.headerTexts}>
              <Text style={[styles.headerTitle, { fontSize: 14 }]}>{headerTitle}</Text>
              <Text style={[styles.headerSub, { fontSize: 14 }]}>{headerSubtitle}</Text>
            </View>
          </View>

          {chunkQuestions.map((q: any, index: number) => {
            const actualIndex = questionsPerPage === 0 ? index : q.realIndex;
            const isRow = q.layout === 'row';
            const qScale = q.scale || 1; 

            return (
              <View key={actualIndex} style={[styles.questionBlock, { marginBottom: 20 * qScale }]} wrap={false}>
                <Text style={[styles.qNumber, { width: 25 * qScale, fontSize: 12 * qScale }]}>{actualIndex + 1})</Text>
                <View style={styles.texts}>
                  {q.en && <LatexText text={q.en} style={{ color: '#000000', fontSize: 12 * qScale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 12 * qScale }} scale={qScale} />}
                  {q.az && <LatexText text={q.az} style={{ color: '#000000', fontSize: 12 * qScale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 12 * qScale }} scale={qScale} />}
                  {q.ru && <LatexText text={q.ru} style={{ color: '#000000', fontSize: 12 * qScale, lineHeight: 1.4, fontWeight: 'bold', marginBottom: 16 * qScale }} scale={qScale} />}
                  
                  {q.image && <Image src={q.image} style={[styles.qImage, { width: (q.imageWidth || 200) * qScale, alignSelf: q.imagePosition || 'center', marginBottom: 15 * qScale, marginTop: 10 * qScale }]} />}

                  <View style={{ marginTop: 5 * qScale, flexDirection: isRow ? 'row' : 'column', flexWrap: 'wrap', width: '100%' }}>
                    {q.options.map((opt: any, oIndex: number) => (
                      <View key={oIndex} style={[{ marginBottom: 4 * qScale }, isRow ? { flex: 1, paddingRight: 5 * qScale } : { marginLeft: 10 * qScale }]}>
                        {opt.en && (
                          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 2 * qScale }}>
                            <Text style={{ color: '#000000', fontSize: 11 * qScale, marginRight: 4 * qScale, fontWeight: 'bold' }}>{String.fromCharCode(65 + oIndex)})</Text>
                            <View style={{ flex: 1 }}><LatexText text={opt.en} style={{ color: '#000000', fontSize: 11 * qScale, fontWeight: 'bold' }} scale={qScale} /></View>
                          </View>
                        )}
                        {opt.az && (
                          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 2 * qScale, marginLeft: isRow ? 0 : 15 * qScale }}>
                            <View style={{ flex: 1 }}><LatexText text={opt.az} style={{ color: '#000000', fontSize: 11 * qScale, fontWeight: 'bold' }} scale={qScale} /></View>
                          </View>
                        )}
                        {opt.ru && (
                          <View style={{ flexDirection: 'row', width: '100%', marginLeft: isRow ? 0 : 15 * qScale }}>
                            <View style={{ flex: 1 }}><LatexText text={opt.ru} style={{ color: '#000000', fontSize: 11 * qScale, fontWeight: 'bold' }} scale={qScale} /></View>
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
            <View style={[styles.footerContact, { marginTop: 30, paddingTop: 15 }]} wrap={false}>
              {contactPhone && <Text style={[styles.footerText, { fontSize: 12, marginBottom: 5 }]}> Əlaqə nömrəsi: {contactPhone}</Text>}
              {contactInsta && <Text style={[styles.footerText, { fontSize: 12, marginBottom: 5 }]}> Instagram: {contactInsta}</Text>}
            </View>
          )}
        </Page>
      ))}
    </Document>
  );
};

// --- YENİ: INDEXED DB KÖMƏKÇİLƏRİ (Sınırsız Yaddaş Üçün) ---
const DB_NAME = 'PDFGenDB';
const STORE_NAME = 'pdf_store';
const STATE_KEY = 'pdf_generator_saved_state';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveStateToDB = async (data: any) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, STATE_KEY);
  } catch (err) {
    console.error("IndexedDB Save Error:", err);
  }
};

const loadStateFromDB = async (): Promise<any> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB Load Error:", err);
    return null;
  }
};

const clearStateFromDB = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(STATE_KEY);
  } catch (err) {
    console.error("IndexedDB Clear Error:", err);
  }
};
// -----------------------------------------------------------

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  
  const defaultQuestion: Question = { 
    en: '', az: '', ru: '', 
    options: [{ en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }, { en: '', az: '', ru: '' }], 
    isTranslating: false, layout: 'row', imageWidth: 200, imagePosition: 'center', scale: 1
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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion]);
  const [pdfSnapshot, setPdfSnapshot] = useState<any>(null);

  useEffect(() => { 
    setIsClient(true); 
    // YENİ: IndexedDB-dən yükləyirik
    loadStateFromDB().then((parsed: any) => {
      if (parsed) {
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
        if (parsed.orientation !== undefined) setOrientation(parsed.orientation);
      }
    });
  }, []);

  useEffect(() => {
    if (isClient) {
      const stateToSave = {
        questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
        wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, orientation
      };
      // YENİ: IndexedDB-yə asinxron yazırıq (daha sürətli və limitsiz)
      saveStateToDB(stateToSave);
    }
  }, [questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta, wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, orientation, isClient]);

  const handleExportProject = () => {
    const stateToSave = {
      questions, logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
      wmText, wmOpacity, wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, orientation
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToSave));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", (headerTitle || "Imtahan").replace(/\s+/g, '_') + "_Layihe.json");
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  };

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

  const handleReset = async () => {
    if (window.confirm("Bütün məlumatlar silinəcək və sıfırlanacaq. Əminsiniz?")) {
      await clearStateFromDB(); // YENİ: IndexedDB təmizlənməsi
      window.location.reload(); 
    }
  };

  const handleGeneratePDF = () => {
    const cleanedQuestions = questions.map(q => ({
      ...q,
      en: cleanAIText(q.en),
      az: cleanAIText(q.az),
      ru: cleanAIText(q.ru),
      options: q.options.map(opt => ({
        en: cleanAIText(opt.en),
        az: cleanAIText(opt.az),
        ru: cleanAIText(opt.ru),
      }))
    }));

    setPdfSnapshot({
      questions: cleanedQuestions,
      logoUrl, headerTitle, headerSubtitle, contactPhone, contactInsta,
      watermark: wmText,
      opacity: wmOpacity, 
      wmMode, wmX, wmY, wmRows, wmCols, questionsPerPage, orientation
    });
  };

  const addQuestion = () => { setQuestions([...questions, defaultQuestion]); setPdfSnapshot(null); };

  const hasOnlyMathsOrNumbers = (text: string) => {
    if (!text || text.trim() === '') return false;
    const textWithoutLatex = text.replace(/\\[a-zA-Z]+/g, '');
    return !/[a-zA-Zа-яА-ЯёЁəƏöÖğĞıİüÜçÇşŞ]/.test(textWithoutLatex);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => { 
    const newQs = [...questions]; 
    const prevValue = newQs[index][field as keyof Question]; 
    
    newQs[index] = { ...newQs[index], [field]: value }; 

    if (['en', 'az', 'ru'].includes(field as string) && typeof value === 'string') {
      if (hasOnlyMathsOrNumbers(value)) {
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

    if (hasOnlyMathsOrNumbers(value)) {
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

      if (data.examTitle) setHeaderTitle(data.examTitle);
      if (data.examSubtitle) setHeaderSubtitle(data.examSubtitle);
      if (data.contactPhone) setContactPhone(data.contactPhone);
      if (data.contactInsta) setContactInsta(data.contactInsta);

      if (data.questions && data.questions.length > 0) {
        const extractedQuestions = data.questions.map((extQ: any) => {
          const lang = extQ.language || 'az'; 
          const isEn = lang === 'en';
          const isAz = lang === 'az';
          const isRu = lang === 'ru';

          return {
            ...defaultQuestion,
            en: isEn ? cleanAIText(extQ.text) : '',
            az: isAz ? cleanAIText(extQ.text) : '',
            ru: isRu ? cleanAIText(extQ.text) : '',
            scale: 1,
            options: [0, 1, 2, 3].map((i) => ({
              en: isEn ? cleanAIText(extQ.options[i] || '') : '',
              az: isAz ? cleanAIText(extQ.options[i] || '') : '',
              ru: isRu ? cleanAIText(extQ.options[i] || '') : '',
            }))
          };
        });

        setQuestions(extractedQuestions);
        setPdfSnapshot(null); 
        alert(`✅ PDF uğurla oxundu! ${extractedQuestions.length} sual və başlıqlar bərpa edildi.`);
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
          
          targetQ.en = cleanAIText(translated.en?.text) || targetQ.en;
          targetQ.az = cleanAIText(translated.az?.text) || targetQ.az;
          targetQ.ru = cleanAIText(translated.ru?.text) || targetQ.ru;
          
          targetQ.options = targetQ.options.map((opt, oIndex) => ({
            en: cleanAIText(translated.en?.options?.[oIndex]) || opt.en,
            az: cleanAIText(translated.az?.options?.[oIndex]) || opt.az,
            ru: cleanAIText(translated.ru?.options?.[oIndex]) || opt.ru,
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
            
            targetQ.en = cleanAIText(translated.en?.text) || targetQ.en;
            targetQ.az = cleanAIText(translated.az?.text) || targetQ.az;
            targetQ.ru = cleanAIText(translated.ru?.text) || targetQ.ru;
            
            targetQ.options = targetQ.options.map((opt, oIndex) => ({
              en: cleanAIText(translated.en?.options?.[oIndex]) || opt.en,
              az: cleanAIText(translated.az?.options?.[oIndex]) || opt.az,
              ru: cleanAIText(translated.ru?.options?.[oIndex]) || opt.ru,
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
        
        <div className="bg-white p-4 rounded-lg shadow border sticky top-0 z-20 mb-6">
          <div className="flex justify-between items-center mb-3 border-b pb-3">
            <h1 className="text-2xl font-bold text-blue-900">PDF Generator</h1>
            
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
                
                <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded border border-yellow-300 mr-2">
                  <span className="text-[10px] font-bold text-yellow-800">🔍 {q.scale || 1}x</span>
                  <input 
                    type="range" min="0.5" max="2" step="0.05" 
                    value={q.scale || 1} 
                    onChange={(e) => updateQuestion(i, 'scale', parseFloat(e.target.value))} 
                    className="w-16 h-1 accent-yellow-600 cursor-pointer" 
                  />
                </div>

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