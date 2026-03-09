import { MapEvent } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function exportToCSV(events: MapEvent[], filename = 'pulsemap_export.csv') {
    if (events.length === 0) return;

    const headers = ['ID', 'Date', 'Category', 'Title', 'Location', 'Latitude', 'Longitude', 'Description'];
    const rows = events.map(e => [
        e.id,
        new Date(e.timestamp).toISOString(),
        e.category,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.location.name.replace(/"/g, '""')}"`,
        e.location.lat,
        e.location.lng,
        `"${e.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function exportToPDF(events: MapEvent[], mapElementId: string, filename = 'pulsemap_report.pdf') {
    const mapElement = document.getElementById(mapElementId);
    if (!mapElement) throw new Error('Map container not found');

    // Capture the map as an image
    const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        ignoreElements: (element) => element.classList.contains('leaflet-control-container') // hide zoom/attribution
    });

    const mapImage = canvas.toDataURL('image/jpeg', 0.8);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Header Background
    pdf.setFillColor(20, 20, 20);
    pdf.rect(0, 0, pageWidth, 25, 'F');

    // Tactical Header Text
    pdf.setTextColor(255, 50, 50); // Red Accent
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('PULSEMAP', 15, 16);

    pdf.setTextColor(200, 200, 200);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('TACTICAL INTELLIGENCE BRIEFING', 55, 16);

    // Timestamp
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated: ${new Date().toISOString().replace('T', ' ').split('.')[0]} UTC`, pageWidth - 15, 16, { align: 'right' });

    // Add Map Screenshot
    const imgWidth = pageWidth - 30;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(mapImage, 'JPEG', 15, 30, imgWidth, imgHeight);

    // Add Summary Stats
    let y = 30 + imgHeight + 15;
    pdf.setTextColor(0, 0, 0); // Black text for printable area
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Situation Overview', 15, y);

    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Detected Signals: ${events.length}`, 15, y);

    // Breakdown Categories
    const categories: Record<string, number> = {};
    events.forEach(e => categories[e.category] = (categories[e.category] || 0) + 1);

    y += 6;
    Object.entries(categories).forEach(([cat, count]) => {
        pdf.text(`- ${cat.toUpperCase()}: ${count}`, 20, y);
        y += 5;
    });

    // Disclaimer / Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('RESTRICTED - DO NOT DISTRIBUTE', 15, pdf.internal.pageSize.getHeight() - 15);

    pdf.save(filename);
}
