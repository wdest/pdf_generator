'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// React-PDF SSR xətası verməsin deyə dinamik yükləyirik
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

// AZ və RU hərflərini dəstəkləyən font
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf'
});

// PDF Dizayn Şablonu (Sənin atdığın şəklə uyğunlaşdırılıb)
const styles = StyleSheet.create({
  page: { 
    paddingTop: 40, 
    paddingBottom: 40, 
    paddingLeft: 50, 
    paddingRight: 50, 
    fontFamily: 'Roboto', 
    fontSize: 11,
    position: 'relative'
  },
  // Arxa fon (Watermark) üçün stil
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1, // Şəffaflıq
    zIndex: -1,
  },
  questionBlock: { 
    marginBottom: 30,
    display: 'flex',
    flexDirection: 'row'
  },
  qNumber: { 
    width: 25, 
    fontWeight: 'bold',
    fontSize: 12
  },
  texts: { 
    flex: 1 
  },
  textEn: { 
    marginBottom: 8, 
    color: '#000',
    fontSize: 12,
    lineHeight: 1.4
  },
  textAz: { 
    marginBottom: 15, 
    color: '#333', // Tərcümə bir az fərqli tonda
    fontSize: 12,
    lineHeight: 1.4
  },
  optionsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 5,
    paddingRight: 20
  },
  option: { 
    flex: 1,
    fontSize: 12
  },
});

// TypeScript üçün tiplər
interface Question {
  en: string;
  az: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
}

const MyDocument = ({ questions }: { questions: Question[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Əgər public qovluğunda arxa fon şəklin varsa, adını bg.png edib buranı aça bilərsən */}
      {/* <Image src="/bg.png" style={styles.background} /> */}
      
      {questions.map((q, index) => (
        <View key={index} style={styles.questionBlock} wrap={false}>
          <Text style={styles.qNumber}>{index + 1})</Text>
          <View style={styles.texts}>
            {q.en && <Text style={styles.textEn}>{q.en}</Text>}
            {q.az && <Text style={styles.textAz}>{q.az}</Text>}
            
            <View style={styles.optionsRow}>
              <Text style={styles.option}>A) {q.optA}</Text>
              <Text style={styles.option}>B) {q.optB}</Text>
              <Text style={styles.option}>C) {q.optC}</Text>
              <Text style={styles.option}>D) {q.optD}</Text>
            </View>
          </View>
        </View>
      ))}
    </Page>
  </Document>
);

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [qCount, setQCount] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([
    { en: '', az: '', optA: '', optB: '', optC: '', optD: '' }
  ]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value) || 1;
    setQCount(count);
    const newQs = Array.from({ length: count }, (_, i) => questions[i] || { en: '', az: '', optA: '', optB: '', optC: '', optD: '' });
    setQuestions(newQs);
  };

  const updateQuestion = (index: number, field: keyof Omit<Question, 'hasImage'>, value: string) => {
    const newQs = [...questions];
    newQs[index][field] = value;
    setQuestions(newQs);
  };

  if (!isClient) return null; // Hydration error-un qarşısını almaq üçün

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 text-black">
        <h1 className="text-2xl font-bold mb-6">Olimpiada PDF Şablonu</h1>
        
        <div className="mb-6">
          <label className="block mb-2 font-semibold">Sual Sayı:</label>
          <input 
            type="number" 
            min="1" 
            value={qCount} 
            onChange={handleCountChange}
            className="border-2 border-gray-300 p-2 rounded w-24 text-black focus:border-blue-500"
          />
        </div>

        {questions.map((q, i) => (
          <div key={i} className="border-2 border-gray-200 p-5 mb-6 rounded bg-gray-50">
            <h3 className="font-bold mb-3 text-lg border-b pb-2">{i + 1}-ci Sual</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <textarea 
                placeholder="İngiliscə şərt..." 
                value={q.en} 
                onChange={(e) => updateQuestion(i, 'en', e.target.value)} 
                className="border p-3 rounded h-28 resize-none" 
              />
              <textarea 
                placeholder="Azərbaycanca tərcüməsi..." 
                value={q.az} 
                onChange={(e) => updateQuestion(i, 'az', e.target.value)} 
                className="border p-3 rounded h-28 resize-none" 
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <input type="text" placeholder="A variantı" value={q.optA} onChange={(e) => updateQuestion(i, 'optA', e.target.value)} className="border p-2 rounded" />
              <input type="text" placeholder="B variantı" value={q.optB} onChange={(e) => updateQuestion(i, 'optB', e.target.value)} className="border p-2 rounded" />
              <input type="text" placeholder="C variantı" value={q.optC} onChange={(e) => updateQuestion(i, 'optC', e.target.value)} className="border p-2 rounded" />
              <input type="text" placeholder="D variantı" value={q.optD} onChange={(e) => updateQuestion(i, 'optD', e.target.value)} className="border p-2 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-center">
        <PDFDownloadLink 
          document={<MyDocument questions={questions} />} 
          fileName="Olimpiada_Testi.pdf"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg"
        >
          {({ loading }) => (loading ? 'PDF Şablonu Hazırlanır...' : 'PDF-i Yüklə')}
        </PDFDownloadLink>
      </div>
    </div>
  );
}