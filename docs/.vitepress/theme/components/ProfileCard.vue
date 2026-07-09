<template>
  <div class="profile-card">
    <img
      class="profile-avatar"
      :src="$withBase('/images/author.jpg')"
      alt="Xu Xuecong"
    />

    <h2>Xu Xuecong</h2>
    <p class="profile-subtitle">Personal Knowledge Base</p>

    <div class="profile-tags">
      <span>Optimization</span>
      <span>Python</span>
      <span>Operations Research</span>
      <span>Scheduling</span>
    </div>

    <div class="profile-links">
      <a href="https://github.com/你的GitHub用户名" target="_blank">GitHub</a>
      <a href="mailto:你的邮箱">Email</a>
    </div>
  </div>
</template>