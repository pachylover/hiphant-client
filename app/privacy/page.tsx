export default function PrivacyPage() {
  return (
    <div className="container py-12 mx-auto">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">개인정보 처리 방침</h1>
          <p className="text-muted-foreground">최종 수정일: 2026년 2월 18일</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. 수집하는 개인정보</h2>
            <p className="text-muted-foreground leading-relaxed">
              HiPhant는 서비스 제공을 위해 최소한의 개인정보를 수집합니다. 사용자가 입력한 비디오 URL 정보는
              하이라이트 생성 목적으로만 사용되며, 별도로 저장되지 않습니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. 개인정보의 이용 목적</h2>
            <p className="text-muted-foreground leading-relaxed">수집된 정보는 다음의 목적을 위해 사용됩니다:</p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>비디오 하이라이트 타임스탬프 생성 서비스 제공</li>
              <li>서비스 개선 및 품질 향상</li>
              <li>사용자 문의 및 고객 지원</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-muted-foreground leading-relaxed">
              사용자의 개인정보는 서비스 이용 기간 동안에만 보유되며, 목적 달성 후 즉시 파기됩니다. 다만, 관련 법령에
              따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. 개인정보의 제3자 제공</h2>
            <p className="text-muted-foreground leading-relaxed">
              HiPhant는 사용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의해 요구되는 경우나 사용자의
              동의가 있는 경우에는 예외로 합니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. 사용자의 권리</h2>
            <p className="text-muted-foreground leading-relaxed">
              사용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있습니다. 개인정보 관련 문의사항은
              hiphant.contact@gmail.com으로 연락 주시기 바랍니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. 쿠키 사용</h2>
            <p className="text-muted-foreground leading-relaxed">
              본 서비스는 사용자 경험 개선을 위해 쿠키를 사용할 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키 사용을
              거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. 개인정보 보호책임자</h2>
            <p className="text-muted-foreground leading-relaxed">
              개인정보 보호와 관련한 문의사항이 있으시면 아래 연락처로 문의해 주시기 바랍니다.
            </p>
            <div className="rounded-lg bg-muted p-4 text-muted-foreground">
              <p>이메일: hiphant.contact@gmail.com</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. 개인정보 처리방침 변경</h2>
            <p className="text-muted-foreground leading-relaxed">
              본 개인정보 처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있으며, 변경
              시 웹사이트를 통해 공지합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
