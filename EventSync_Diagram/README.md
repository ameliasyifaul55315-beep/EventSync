# EventSync — Kumpulan Diagram (draw.io)

Buka tiap file `.drawio` di https://app.diagrams.net (File > Open from > Device) atau draw.io Desktop. Semua file XML polos (tidak terkompresi) sehingga tetap bisa diedit.

| File | Isi |
|---|---|
| 01_ERD_Konseptual_Chen.drawio | ERD Chen: 8 entitas (7 tabel domain + personal_access_tokens), kardinalitas, aturan ON DELETE |
| 02_DFD_Diagram_Konteks.drawio | DFD konteks (User/Peserta, Organizer, Admin) |
| 03_DFD_Level_0.drawio | DFD Level 0: 6 proses, 8 data store |
| 04_UML_Use_Case.drawio | Use case: 3 aktor, 17 use case |
| 05_Activity_Pengajuan_Review_Event.drawio | Activity swimlane: draft → review → approved/rejected → cancelled |
| 06_Sequence_Pendaftaran_Event.drawio | Sequence `POST /api/events/{id}/register` sesuai `RegistrationController` |

Detail perubahan revisi audit ada di `LAPORAN_AUDIT.md` (bagian "Temuan diagram") di root proyek.

## Konvensi
- ERD: PK bergaris bawah (kuning), FK oranye, UNIQUE gabungan putus-putus. Garis/elemen **putus-putus biru** = relasi polimorfik/logis tanpa foreign key database (Sanctum).
- Use case: garis putus-putus abu-abu dari Admin = fungsi tersedia di API tetapi belum ada tombolnya di UI admin.
- Sumber kebenaran diagram: migration, model, routes, dan controller di `EventSync_Backend/EventSync`.
