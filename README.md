<p align="center">
  <img src="public/meta-ads-ai.png" alt="Meta Ads AI" width="80" height="80">
</p>

# Meta Ads AI

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
- Khi bấm Sign out và xóa phiên thành công, website gọi đúng một bridge theo thứ tự: `window.flutter_inappwebview.callHandler('logout')`, `window.logout()`, `window.logout.postMessage('logout')`, `window.webkit.messageHandlers.logout.postMessage('logout')`, hoặc `window.ReactNativeWebView.postMessage('logout')`. App native cần đăng ký hàm/channel/handler tương ứng; nếu trả Promise thì phải hoàn tất Promise sau khi xử lý. Website chờ lời gọi này trước khi chuyển về `/login`. Khi không tìm thấy bridge hoặc lời gọi thất bại, console có cảnh báo `[WebView]` và website vẫn về `/login`. Đăng xuất tự động do hết phiên không gửi sự kiện này; không gọi `openExternalBrowser` khi đăng xuất.
