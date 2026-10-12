import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

Future<void> shareAirmsPdf({required String title, required String fileName,
    required List<String> columns, required List<List<String>> rows,
    String? subtitle}) async {
  final document = pw.Document();
  final headerStyle = pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9);
  final cellStyle = const pw.TextStyle(fontSize: 8);
  document.addPage(pw.MultiPage(pageFormat: PdfPageFormat.a4.landscape,
    margin: const pw.EdgeInsets.all(28),
    header: (_) => pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
      pw.Text('AirMS', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.green800)),
      pw.Text(DateTime.now().toLocal().toIso8601String().split('T').first),
    ]),
    footer: (context) => pw.Align(alignment: pw.Alignment.centerRight,
      child: pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: const pw.TextStyle(fontSize: 8))),
    build: (_) => [
      pw.SizedBox(height: 12),
      pw.Text(title, style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
      if (subtitle != null) pw.Text(subtitle, style: const pw.TextStyle(fontSize: 10)),
      pw.SizedBox(height: 16),
      pw.Table(border: pw.TableBorder.all(color: PdfColors.grey300, width: .5),
        children: [
          pw.TableRow(decoration: const pw.BoxDecoration(color: PdfColors.green800), children: [
            for (final column in columns) pw.Padding(padding: const pw.EdgeInsets.all(5), child: pw.Text(column, style: headerStyle)),
          ]),
          for (final row in rows) pw.TableRow(children: [
            for (var index = 0; index < columns.length; index++) pw.Padding(
              padding: const pw.EdgeInsets.all(5), child: pw.Text(index < row.length ? row[index] : '', style: cellStyle)),
          ]),
        ]),
      pw.SizedBox(height: 12), pw.Text('${rows.length} records', style: const pw.TextStyle(fontSize: 9)),
    ]));
  await Printing.sharePdf(bytes: await document.save(), filename: fileName);
}
