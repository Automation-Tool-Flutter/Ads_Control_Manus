<p align="center">
  <img src="public/meta-ads-ai.png" alt="Meta Ads AI" width="80" height="80">
</p>

# Meta Ads AI

## Public data portal API

`POST /postdata` nhận JSON và chuyển tiếp đúng 4 trường đến
`https://web.az-sellers.com/data-portal/web/send`. Không cần login; hỗ trợ CORS
và preflight `OPTIONS` cho ứng dụng ngoài gọi. `token: webaccess` là giá trị
payload mặc định do server thêm, không phải cơ chế xác thực API này.

Đường dẫn cũ `/api/data-portal/send` vẫn hoạt động. Dùng một dấu `/` trước
`postdata` để tránh chuyển hướng chuẩn hóa URL của Next.js.

```json
{
  "data": "Nội dung cần gửi",
  "appName": "demo",
  "botId": "123"
}
```

Gửi với `Content-Type: application/json`. Ba trường `data`, `appName`, `botId` phải là string.
Không cần gửi `token`; server luôn chuyển tiếp `token: "webaccess"`.
Để tương thích, vẫn nhận `token: "webaccess"` nếu caller gửi, nhưng từ chối giá trị khác.
`data` nhận chuỗi bất kỳ (kể cả chuỗi rỗng) và được chuyển tiếp nguyên vẹn,
không kiểm tra, mã hóa hay giải mã Base64. Body tối đa 16 KiB; thời gian chờ dịch vụ đích 10 giây.
API không đọc cookie, không lưu hoặc ghi log payload và không tự retry POST.

Khi dịch vụ đích trả HTTP 2xx, API trả HTTP 200 với
`{"success":true,"upstreamStatus":200}` (upstreamStatus là mã thực tế).
Đây là xác nhận HTTP của dịch vụ đích, không xác nhận xử lý nghiệp vụ bên đó.
Lỗi JSON/schema trả 400, quá dung lượng 413, sai Content-Type 415,
lỗi kết nối/dịch vụ đích 502, hết thời gian chờ 504.
Nội dung phản hồi của dịch vụ đích không được chuyển lại cho caller.

Ứng dụng quản lý quảng cáo Meta với AI hỗ trợ phân tích, tối ưu campaign và quản lý Page, thiết kế ưu tiên người dùng mobile.

**Nội dung:** [Phân tích AI](#1-phân-tích-và-tối-ưu-bằng-ai) · [Quản lý quảng cáo và Page](#2-quản-lý-quảng-cáo-và-page) · [Trải nghiệm mobile](#3-giao-diện-và-trải-nghiệm-mobile)

## 1. Phân tích và tối ưu bằng AI

| Chức năng | Nội dung đã triển khai |
| :--- | :--- |
| **Meta AI Chat** | Chat nổi và trang hội thoại riêng; hỏi đáp về quảng cáo, so sánh hai kỳ, trả về số liệu, đề xuất và liên kết tới campaign/ad set liên quan. |
| **Performance Intelligence** | Phân tích account, campaign, ad set; chấm điểm, đánh giá KPI theo mục tiêu và đề xuất tối ưu. |
| **Root Cause Analysis** | Phân tích nguyên nhân hiệu suất thay đổi; trình bày bằng chứng, mức độ tin cậy và bước kiểm tra tiếp theo. |
| **Budget Studio** | Đề xuất phân bổ ngân sách, mô phỏng trước khi áp dụng; cập nhật từng campaign hoặc toàn bộ kế hoạch ngân sách được hỗ trợ. |
| **Audience Insights** | Phân tích tuổi, giới tính, khu vực và vị trí quảng cáo; nhận diện tín hiệu bão hòa, nguy cơ trùng tệp và đề xuất hướng targeting. |
| **Diagnostics** | Kiểm tra các dấu hiệu bất thường về phân phối, chi phí, tracking và mệt mỏi quảng cáo. |
| **Creative Intelligence** | Đánh giá bài viết và mẫu quảng cáo; tìm nội dung hiệu quả, đề xuất bài nên boost, headline, nội dung, CTA và creative brief. |
| **AI Campaign Builder** | Tạo bản đề xuất campaign, ad set, ngân sách, targeting, nội dung và kế hoạch thử nghiệm; hỗ trợ tạo lên Meta ở trạng thái `PAUSED` khi đủ điều kiện. |
| **Growth Plans** | Lập kế hoạch tối ưu **7 hoặc 14 ngày**; theo dõi tiến độ, áp dụng các hành động được hỗ trợ và hoàn tác một số thay đổi. |
| **Learning Hub** | Ghi nhận đề xuất đã áp dụng, đối chiếu kết quả tại mốc **3/7/14 ngày** và tổng hợp kinh nghiệm cho các lần phân tích tiếp theo. |
| **Action Center** | Gom đề xuất từ nhiều công cụ; phân loại ưu tiên, phát hiện đề xuất mâu thuẫn, đánh dấu đã xem/bỏ qua và xuất CSV. |

## 2. Quản lý quảng cáo và Page

| Chức năng | Thao tác hỗ trợ |
| :--- | :--- |
| **Dashboard** | Xem biểu đồ, chỉ số hiệu suất, campaign theo chi tiêu, công việc cần xem và xuất dữ liệu. |
| **Ad accounts** | Xem danh sách tài khoản, tìm kiếm, lọc trạng thái, xem thông tin ngân sách và chuyển tài khoản. |
| **Campaign manager** | Xem **campaign → ad set → ad**; chọn nhiều mục để phân tích, thay đổi trạng thái và chỉnh ngân sách tại các vị trí hỗ trợ. |
| **Page** | Xem bài đã đăng/lên lịch; tạo, sửa, xóa bài; đăng ảnh; gợi ý nội dung bằng AI; phân tích bài viết và Page Insights. |
| **Bình luận** | Trả lời, thích, ẩn/hiện và xóa khi có quyền. |
| **Boost Post** | Chọn tài khoản quảng cáo, ngân sách, thời gian và đối tượng. |
| **Business assets / Product catalogs** | Xem danh mục doanh nghiệp, tài sản liên quan, catalog và sản phẩm. |
| **Settings** | Quản lý hồ sơ, giao diện sáng/tối và các thông tin kết nối hiện có. |

## 3. Giao diện và trải nghiệm mobile

| Hạng mục | Thiết kế và trải nghiệm |
| :--- | :--- |
| **Nhận diện thương hiệu** | Tên ứng dụng **Meta Ads AI**, logo riêng, màu chủ đạo **xanh da trời**. |
| **Biểu tượng điều hướng** | Nút **Meta AI** dùng logo mới; mục **Page** dùng icon lá cờ. |
| **Menu và phím tắt** | Menu dưới, menu công cụ và tối đa **6 phím tắt** tùy chỉnh. |
| **Thẻ dữ liệu** | Phong cách Meta Ads Manager, ưu tiên thiết bị cảm ứng. |
| **Hộp thoại** | Thích ứng bàn phím, khóa cuộn nền và xử lý vùng an toàn màn hình. |
| **Nút bấm và biểu mẫu** | Vùng chạm lớn hơn, bộ lọc ngày rõ ràng, thông báo lỗi và chống gửi lặp ở các thao tác đã nâng cấp. |
| **Chat AI** | Giữ vị trí đang đọc, có nút về tin mới và xác nhận trước khi xóa hội thoại. |
| **Ngôn ngữ giao diện** | Nhãn chức năng bằng **tiếng Anh**. |

## 4. Phiên đăng nhập bằng cookie


- Phiên đăng nhập và trạng thái OAuth dùng cookie HttpOnly, SameSite=Lax, Path=/; bật Secure khi chạy HTTPS. WebView cần cho phép cookie của chính website.
- `/api/auth/session` tạo, khôi phục và xóa phiên. Giao diện chỉ nhận hồ sơ và mã phiên công khai; thuộc tính `AuthState.token` hiện là mã phân biệt bộ nhớ đệm, không phải Facebook access token.
- Các lệnh đọc/ghi Facebook và tải ảnh đi qua `/api/facebook`. Server đọc token từ cookie, lấy Page token khi cần và loại bỏ thông tin xác thực khỏi phản hồi, kể cả URL phân trang. Các API này không được cache bởi CDN.
- Luồng OAuth hiện có vẫn nhận token tạm thời trong callback Facebook, xóa fragment khỏi URL và gửi token cho server để xác minh/lưu cookie; không ghi token vào localStorage hoặc sessionStorage.
- Khi nâng cấp, dữ liệu đăng nhập localStorage và cache Graph cũ bị xóa; người dùng đăng nhập lại một lần. Đăng xuất chỉ hoàn tất sau khi server xóa cookie. Các tùy chọn giao diện như theme vẫn giữ nguyên.

## Xuất CSV trong trình duyệt và Flutter

Trình duyệt dùng hộp chọn lưu file khi hỗ trợ, hoặc chia sẻ file/tải Blob. CSV có UTF-8 BOM và CRLF để giữ tiếng Việt khi mở bằng Excel. Nút xuất chặn bấm lặp và báo lỗi thay vì im lặng.

Flutter nhận `callHandler('downloadFile', {filename, mimeType, encoding: 'base64', data})`. Không gửi URL `blob:` sang `openExternalBrowser`: URL đó chỉ tồn tại trong trang WebView. Cần thêm handler dưới đây trong `_handleInitScript`, bên cạnh `logout`. Mã Flutter nằm ngoài repository này nên phần tích hợp cần thực hiện trong project app.

Thêm `share_plus` và `cross_file` với phiên bản tương thích project Flutter. Ví dụ dùng API `SharePlus.instance.share` theo [tài liệu share_plus](https://pub.dev/packages/share_plus). Hộp chia sẻ cho phép người dùng chọn nơi lưu hoặc ứng dụng nhận file; không đồng nghĩa file đã tự lưu vào Downloads.

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cross_file/cross_file.dart';
import 'package:share_plus/share_plus.dart';

// Trong _handleInitScript, sau khi kiểm tra controller != null:
controller.addJavaScriptHandler(
  handlerName: 'downloadFile',
  callback: (args) async {
    try {
      if (args.length != 1 || args.first is! Map) {
        return {'success': false};
      }
      final payload = Map<String, dynamic>.from(args.first as Map);
      if (payload['mimeType'] != 'text/csv' ||
          payload['encoding'] != 'base64' ||
          payload['data'] is! String || payload['filename'] is! String) {
        return {'success': false};
      }
      final encoded = payload['data'] as String;
      if (encoded.length > 14 * 1024 * 1024) return {'success': false};
      final bytes = base64Decode(encoded);
      if (bytes.length > 10 * 1024 * 1024) return {'success': false};
      final name = payload['filename'] as String;
      if (!RegExp(r'^[\w. -]+\.csv$').hasMatch(name)) {
        return {'success': false};
      }
      if (!mounted) return {'success': false};
      final box = context.findRenderObject();
      final origin = box is RenderBox && box.hasSize
          ? box.localToGlobal(Offset.zero) & box.size
          : const Rect.fromLTWH(0, 0, 1, 1);
      final result = await SharePlus.instance.share(ShareParams(
        files: [XFile.fromData(bytes, mimeType: 'text/csv')],
        fileNameOverrides: [name],
        sharePositionOrigin: origin,
      ));
      if (result.status == ShareResultStatus.dismissed) {
        return {'cancelled': true};
      }
      return {'success': true}; // File đã được chuyển cho hộp chia sẻ native.
    } catch (error) {
      debugPrint('CSV export failed: $error');
      return {'success': false};
    }
  },
);
```
- Khi bấm Sign out, website ưu tiên gọi `window.flutter_inappwebview.callHandler('logout')` ngay, đợi 1,5 giây rồi mới gửi yêu cầu xóa cookie và cập nhật giao diện. Không chờ phản hồi native để tiếp tục dọn phiên; yêu cầu DELETE dùng keepalive để có thể tiếp tục khi trang rời đi. Nếu Flutter đóng/hủy WebView ngay, phía native cần bảo đảm xóa cookie của website vì keepalive không bảo đảm tồn tại sau khi WebView bị hủy. Các bridge khác chỉ là dự phòng khi không có Flutter bridge. Đăng xuất tự động do hết phiên không gửi sự kiện này; không gọi `openExternalBrowser` khi đăng xuất.
