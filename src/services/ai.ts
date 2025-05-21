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
    console.log('Starting bug analysis and report generation in a single request...');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const conversationBatchesDir = path.join(config.outputDir, 'conversation-batches');
    const finalReportsDir = path.join(config.outputDir, 'final-reports');
    
    await fs.mkdir(conversationBatchesDir, { recursive: true });
    await fs.mkdir(finalReportsDir, { recursive: true });
    
    const messageBatches = [formattedMessages];
    console.log(`Split messages into ${messageBatches.length} batches for processing`);
    
    const conversationMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: getAnalysisAndReportPrompt() }
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
    
    console.log('Sending batched conversation to DeepSeek API for unified analysis and report...');
    const response = await withRetry(async () => {
      return await aiClient.chat.completions.create({
        model: config.ai.model,
        messages: conversationMessages,
        temperature: 0,
        max_tokens: config.ai.maxOutputTokens,
      });
    }, 3, 2000);
    
    const finalReport = response.choices[0].message.content ?? '';
    
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
function getAnalysisAndReportPrompt(): string {
  return `Anda adalah seorang analis bug profesional. Tugas Anda adalah membaca dan menganalisis pesan-pesan dari channel bug report Slack (yang akan diberikan dalam beberapa bagian). Gabungkan seluruh informasi dari semua bagian untuk menghasilkan satu laporan akhir yang komprehensif, terstruktur, dan mudah dipahami dalam format markdown.

Laporan akhir harus memuat:

1. **Ringkasan Eksekutif**  
   Sajikan highlight temuan utama, statistik penting, dan insight paling menonjol dari seluruh laporan.

2. **Daftar & Analisis Bug**  
   - Rincikan semua bug yang dilaporkan: siapa pelapor, waktu, status penyelesaian.  
   - Identifikasi bug yang paling sering muncul dan paling berdampak.  
   - Kelompokkan bug berdasarkan kategori (UI, backend, database, API, keamanan, performa, dll).

3. **Statistik Pelapor**  
   - Urutkan pelapor bug terbanyak (top 5), jumlah dan jenis bug yang mereka laporkan.  
   - Evaluasi kualitas laporan dari masing-masing pelapor (apakah detail atau tidak).

4. **Statistik Command & Solusi**  
   - Daftar command/perintah yang digunakan untuk memperbaiki bug, seberapa sering digunakan, dan efektivitasnya.  
   - Siapa yang paling sering memberikan solusi.

5. **Waktu Penyelesaian**  
   - Hitung rata-rata waktu penyelesaian bug (dalam menit).  
   - Sebutkan bug yang paling cepat dan paling lama diselesaikan, serta faktor yang mempengaruhi kecepatan penyelesaian.  
   - Siapa yang paling cepat dalam menyelesaikan bug.

6. **Tren & Pola**  
   - Temukan pola kemunculan bug (misal: hari/waktu tertentu, setelah deployment, dsb).  
   - Area yang perlu perhatian atau pengujian lebih lanjut.  
   - Analisis tren bug yang meningkat atau menurun, serta korelasi antar bug.

7. **Rekomendasi**  
   - Berikan saran untuk meningkatkan proses pelaporan dan penyelesaian bug.  
   - Rekomendasikan langkah pencegahan agar bug serupa tidak terulang.

**Catatan Penting:** Abaikan pesan "No purchase data found" karena itu bukan bug dan tidak perlu dianalisis.

Format laporan harus rapi, profesional, dan mudah dibaca. Gunakan tabel, bullet, dan deskripsi visualisasi jika relevan. Pastikan membaca seluruh bagian pesan sebelum menyusun laporan akhir.`;
} 