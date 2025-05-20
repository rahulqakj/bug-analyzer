import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import config from '../config';
import { withRetry } from '../utils/retry';
import { ChatCompletionMessageParam } from 'openai/resources';

const aiClient = new OpenAI({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseURL,
});

/**
 * Analyze Slack messages directly without chunking
 * @param formattedMessages Formatted messages string
 * @returns Analysis results
 */
export async function analyzeMessages(formattedMessages: string): Promise<string> {
  try {
    console.log('Starting bug analysis with conversation batching...');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const conversationBatchesDir = path.join(config.outputDir, 'conversation-batches');
    const finalReportsDir = path.join(config.outputDir, 'final-reports');
    
    await fs.mkdir(conversationBatchesDir, { recursive: true });
    await fs.mkdir(finalReportsDir, { recursive: true });
    
    const messageBatches = [formattedMessages];
    console.log(`Split messages into ${messageBatches.length} batches for processing`);
    
    const conversationMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: getComprehensiveAnalysisPrompt() }
    ];

    messageBatches.forEach((batch: string, index: number) => {
      conversationMessages.push({
        role: 'user',
        content: `Bagian ${index + 1} dari ${messageBatches.length}:\n\n${batch}`
      });
    });
    
    const batchesFilename = `conversation-batches-${dateStr}.json`;
    await fs.writeFile(
      path.join(conversationBatchesDir, batchesFilename), 
      JSON.stringify(conversationMessages, null, 2)
    );
    console.log(`Conversation batches saved to ${batchesFilename}`);
    
    console.log('Sending batched conversation to DeepSeek API...');
    const analysisResponse = await withRetry(async () => {
      return await aiClient.chat.completions.create({
        model: config.ai.model,
        messages: conversationMessages,
        temperature: 0,
        max_tokens: config.ai.maxOutputTokens,
      });
    }, 3, 2000);
    
    const analysis = analysisResponse.choices[0].message.content ?? '';
    
    console.log('Analysis completed');
    
    console.log('Generating final markdown report...');
    const finalReportResponse = await withRetry(async () => {
      return await aiClient.chat.completions.create({
        model: config.ai.model,
        messages: [
          { role: 'system', content: getFinalReportPrompt() },
          { role: 'user', content: `Buat laporan berdasarkan data analisis berikut:\n\n${analysis}` }
        ],
        temperature: 0,
        max_tokens: config.ai.maxOutputTokens,
      });
    }, 3, 1000);
    
    const finalReport = finalReportResponse.choices[0].message.content ?? '';
    
    const reportFilename = `final_report-${dateStr}.md`;
    await fs.writeFile(path.join(finalReportsDir, reportFilename), finalReport);
    console.log(`Final report saved as ${reportFilename}`);
    
    return finalReport;
    
  } catch (error: unknown) {
    console.error('Error in analysis process:', error);
    if (error instanceof Error) {
      return `Error analyzing messages: ${error.message}`;
    }
    return 'Error analyzing messages: Unknown error occurred';
  }
}

/**
 * Get the comprehensive analysis prompt
 * @returns Prompt string
 */
function getComprehensiveAnalysisPrompt(): string {
  return `Anda adalah analis bug ahli. Analisis pesan dari channel bug report Slack yang akan diberikan dalam beberapa bagian. Gabungkan semua informasi dari semua bagian untuk memberikan analisis tentang:

1. BUGS REPORTED
   - Semua bug yang disebutkan, siapa yang melaporkannya, kapan, status penyelesaian
   - Command/perintah yang digunakan untuk memperbaiki (jika disebutkan)
   - Bug-bug yang paling sering muncul dan paling parah
   - Kategori bug (UI, backend, database, API, keamanan, performa, dll)

2. REPORTER STATISTICS
   - Siapa saja yang melaporkan bug (urutkan berdasarkan jumlah laporan)
   - Berapa bug yang dilaporkan oleh masing-masing orang
   - Jenis bug yang dilaporkan oleh masing-masing orang
   - Kualitas laporan dari setiap pelapor (detail/tidak detail)

3. COMMAND STATISTICS
   - Command apa saja yang disebutkan untuk memperbaiki bug
   - Berapa kali masing-masing command digunakan
   - Untuk bug jenis apa command tersebut digunakan
   - Siapa yang paling sering memberikan solusi dengan command

4. RESOLUTION TIME
   - Rata-rata waktu penyelesaian bug (dalam menit)
   - Bug yang paling cepat dan paling lama diselesaikan
   - Faktor-faktor yang mempengaruhi kecepatan penyelesaian
   - Siapa yang menyelesaikan bug paling cepat (rata-rata)

5. TRENDS AND RECOMMENDATIONS
   - Pola kemunculan bug (hari/waktu tertentu, setelah deployment, dll)
   - Area yang memerlukan lebih banyak pengujian atau perhatian
   - Saran untuk meningkatkan proses pelaporan dan penyelesaian bug

PENTING: "No purchase data found" BUKAN bug dan TIDAK dihitung sebagai bug.

Saya akan memberikan pesan Slack dalam beberapa bagian. Bacalah semua bagian, pahami konteksnya secara keseluruhan, dan berikan analisis komprehensif dalam format JSON yang terstruktur.`;
}

/**
 * Get prompt for final comprehensive report
 * @returns Final report prompt
 */
function getFinalReportPrompt(): string {
  return `Anda adalah analis bug ahli. Berdasarkan data analisis JSON dari channel bug report Slack, buat laporan analisis yang komprehensif dan terstruktur.

Laporan harus mencakup bagian-bagian berikut:

1. RINGKASAN EKSEKUTIF
   - Gambaran umum temuan utama
   - Statistik penting dan highlight

2. BUG YANG DILAPORKAN
   - Ringkasan semua bug yang dilaporkan, berdasarkan frekuensi dan dampaknya
   - Bug-bug yang paling sering muncul dan paling parah
   - Kategori bug (UI, backend, database, API, keamanan, performa, dll)

3. PENYELESAIAN BUG
   - Command atau perintah yang paling sering digunakan untuk menyelesaikan bug
   - Metode penyelesaian yang umum digunakan
   - Solusi paling efektif berdasarkan tingkat keberhasilan

4. WAKTU PENYELESAIAN
   - Rata-rata waktu yang dibutuhkan untuk menyelesaikan bug
   - Bug yang memerlukan waktu terlama untuk diselesaikan dan alasannya
   - Bug yang diselesaikan paling cepat dan faktor yang membuatnya cepat

5. PELAPOR BUG
   - Siapa yang paling sering melaporkan bug (peringkat 5 teratas)
   - Kualitas laporan bug dari masing-masing pelapor
   - Hubungan antara pelapor dan jenis bug

6. TREN DAN POLA
   - Pola kemunculan bug (hari/waktu tertentu, setelah deployment, dll)
   - Tren bug yang sedang berkembang atau menurun
   - Korelasi antara berbagai bug

7. REKOMENDASI
   - Area yang memerlukan lebih banyak pengujian atau perhatian
   - Saran untuk meningkatkan proses pelaporan dan penyelesaian bug
   - Langkah-langkah pencegahan untuk menghindari bug serupa di masa depan

Format laporan dengan rapi dan profesional, dan sertakan tabel, poin, dan visualisasi (yang dideskripsikan) jika relevan.`;
} 