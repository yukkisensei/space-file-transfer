// ============================================
// SPACE FILE TRANSFER - FRONTEND
// Kết nối với Backend API
// ============================================

// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api'; // Production sẽ dùng relative path

// Global variables
let selectedFiles = [];
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeUpload();
    initializeDownload();
    loadStoredFiles();
    checkAuthStatus();
});

// Authentication Functions
function initializeAuth() {
    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }

    // Sign up form
    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', handleSignup);

    // Sign in form
    const signinForm = document.getElementById('signinForm');
    signinForm.addEventListener('submit', handleSignin);
}

async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        alert('Password không khớp!');
        return;
    }

    if (username.length < 3) {
        alert('Username phải có ít nhất 3 ký tự!');
        return;
    }

    if (password.length < 6) {
        alert('Password phải có ít nhất 6 ký tự!');
        return;
    }

    try {
        // Call API to register
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'Đăng ký thất bại!');
            return;
        }

        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        showSection('signin');
        document.getElementById('signupForm').reset();
    } catch (error) {
        console.error('Signup error:', error);
        alert('Lỗi kết nối server!');
    }
}

async function handleSignin(e) {
    e.preventDefault();
    
    const username = document.getElementById('signinUsername').value.trim();
    const password = document.getElementById('signinPassword').value;

    try {
        // Call API to login
        const response = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!result.success) {
            let errorMsg = result.message || 'Đăng nhập thất bại!';
            
            // Show remaining attempts if available
            if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
                errorMsg += `\n\nCòn ${result.remainingAttempts} lần thử.`;
            } else if (result.locked) {
                errorMsg += `\n\nTài khoản đã bị khóa${result.remainingMinutes ? ` trong ${result.remainingMinutes} phút` : ''}.`;
            }
            
            alert(errorMsg);
            return;
        }

        // Login successful
        currentUser = result.data;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateAuthUI();
        alert('Đăng nhập thành công!');
        showSection('upload');
        document.getElementById('signinForm').reset();
    } catch (error) {
        console.error('Signin error:', error);
        alert('Lỗi kết nối server!');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showSection('upload');
    alert('Logged out successfully!');
}

// Go to Admin Console - Owner direct access
function goToAdminConsole() {
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    // Check if user is admin
    if (currentUser.isAdmin) {
        // Go to simple admin page with username in URL
        window.location.href = `admin-simple.html?user=${encodeURIComponent(currentUser.username)}`;
    } else {
        alert('Admin access required');
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const myFilesBtn2 = document.getElementById('myFilesBtn2');
    const profileBtn = document.getElementById('profileBtn');
    const adminConsoleBtn = document.getElementById('adminConsoleBtn');

    if (currentUser) {
        authButtons.classList.add('hidden');
        userInfo.classList.remove('hidden');
        usernameDisplay.textContent = currentUser.displayName || currentUser.username;
        usernameDisplay.title = currentUser.username; // Show full name on hover
        
        if (myFilesBtn2) {
            myFilesBtn2.style.display = 'inline-block'; // Show My Files button
        }
        
        if (profileBtn) {
            profileBtn.style.display = 'inline-block'; // Show Profile button
        }
        
        // Show Admin Console button if user is admin
        if (currentUser.isAdmin) {
            adminConsoleBtn.classList.remove('hidden');
        } else {
            adminConsoleBtn.classList.add('hidden');
        }
    } else {
        authButtons.classList.remove('hidden');
        userInfo.classList.add('hidden');
        
        if (myFilesBtn2) {
            myFilesBtn2.style.display = 'none'; // Hide My Files button
        }
        
        if (profileBtn) {
            profileBtn.style.display = 'none'; // Hide Profile button
        }
        
        adminConsoleBtn.classList.add('hidden'); // Hide Admin Console button
    }
}

function checkAuthStatus() {
    // Check if user is logged in
    if (currentUser) {
        updateAuthUI();
    }
}

// Section Navigation
function showSection(sectionName) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Load My Files when opening that section
    if (sectionName === 'myfiles' && currentUser) {
        loadMyFiles();
    }
    
    // Load Profile when opening that section
    if (sectionName === 'profile' && currentUser) {
        loadProfile();
    }
}

// Load user's uploaded files
async function loadMyFiles() {
    const myFilesList = document.getElementById('myFilesList');
    myFilesList.innerHTML = '<p class="loading-text">Đang tải...</p>';

    try {
        const response = await fetch(`${API_URL}/user/${currentUser.username}/files`);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            myFilesList.innerHTML = '<p class="no-files-text">Bạn chưa upload file nào</p>';
            return;
        }

        // Display files
        myFilesList.innerHTML = '';
        result.data.forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'my-file-card glass-card';
            fileCard.innerHTML = `
                <div class="my-file-info">
                    <div class="my-file-icon">${getFileIcon(file.originalName)}</div>
                    <div class="my-file-details">
                        <h4>${file.originalName}</h4>
                        <p class="my-file-meta">${formatFileSize(file.size)} • Uploaded: ${formatDate(file.uploadDate)}</p>
                        <p class="my-file-stats">👁️ ${file.viewCount || 0} views • 📥 ${file.downloadCount || 0} downloads</p>
                        <p class="my-file-expiry">⏰ Expires: ${formatDate(file.expiryDate)}</p>
                    </div>
                    <div class="file-menu-container" style="position: relative;">
                        <button class="file-menu-btn" onclick="toggleFileMenu(event, '${file.code}')" style="
                            background: transparent;
                            border: none;
                            color: #fff;
                            font-size: 1.5rem;
                            cursor: pointer;
                            padding: 0.5rem;
                            transition: all 0.3s ease;
                        ">⋮</button>
                        <div id="menu-${file.code}" class="file-dropdown-menu" style="
                            display: none;
                            position: absolute;
                            top: 100%;
                            right: 0;
                            background: rgba(0, 0, 0, 0.95);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            padding: 0.5rem;
                            min-width: 150px;
                            z-index: 1000;
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                        ">
                            <button onclick="showWgetLink('${file.code}')" style="
                                width: 100%;
                                padding: 0.75rem;
                                background: transparent;
                                border: none;
                                color: #fff;
                                text-align: left;
                                cursor: pointer;
                                border-radius: 5px;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                💻 Dev Section
                            </button>
                        </div>
                    </div>
                </div>
                <div class="my-file-actions">
                    <button class="liquid-glass-btn copy-link-btn" onclick="copyFileLink('${file.code}')">
                        <span>Copy Link</span>
                    </button>
                    <button class="liquid-glass-btn delete-btn" onclick="deleteMyFile('${file.code}')">
                        <span>🗑️ Delete</span>
                    </button>
                </div>
            `;
            myFilesList.appendChild(fileCard);
        });

    } catch (error) {
        console.error('Load my files error:', error);
        myFilesList.innerHTML = '<p class="error-text">Lỗi khi tải danh sách file</p>';
    }
}

// Copy file link
function copyFileLink(fileCode) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?file=${fileCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Đã copy link!');
    });
}

// Show wget/curl commands
async function showWgetLink(fileCode) {
    try {
        const response = await fetch(`${API_URL}/direct-link/${fileCode}`);
        const result = await response.json();

        if (result.success) {
            const { wgetCommand, curlCommand, directUrl } = result.data;
            
            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(255, 255, 255, 0.2);
            `;
            
            modalContent.innerHTML = `
                <h2 style="color: #fff; margin-bottom: 1.5rem; font-size: 1.5rem;">📥 Direct Download Commands</h2>
                
                <!-- wget -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">wget:</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input readonly id="wget-input" style="
                            flex: 1;
                            padding: 0.75rem;
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            color: #fff;
                            font-family: monospace;
                            font-size: 0.75rem;
                        ">
                        <button class="copy-cmd-btn" data-cmd="wget" style="
                            padding: 0.75rem 1.5rem;
                            background: rgba(0, 0, 0, 0.8);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            border-radius: 10px;
                            color: #fff;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">📋 Copy</button>
                    </div>
                </div>
                
                <!-- curl -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">curl:</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input readonly id="curl-input" style="
                            flex: 1;
                            padding: 0.75rem;
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            color: #fff;
                            font-family: monospace;
                            font-size: 0.75rem;
                        ">
                        <button class="copy-cmd-btn" data-cmd="curl" style="
                            padding: 0.75rem 1.5rem;
                            background: rgba(0, 0, 0, 0.8);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            border-radius: 10px;
                            color: #fff;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">📋 Copy</button>
                    </div>
                </div>
                
                <!-- Direct URL -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Direct URL:</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input readonly id="url-input" style="
                            flex: 1;
                            padding: 0.75rem;
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            color: #fff;
                            font-family: monospace;
                            font-size: 0.75rem;
                        ">
                        <button class="copy-cmd-btn" data-cmd="url" style="
                            padding: 0.75rem 1.5rem;
                            background: rgba(0, 0, 0, 0.8);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            border-radius: 10px;
                            color: #fff;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">📋 Copy</button>
                    </div>
                </div>
                
                <button class="close-modal-btn" style="
                    width: 100%;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                    color: #fff;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                ">✅ OK</button>
            `;
            
            // Set input values safely
            modalContent.querySelector('#wget-input').value = wgetCommand;
            modalContent.querySelector('#curl-input').value = curlCommand;
            modalContent.querySelector('#url-input').value = directUrl;
            
            // Store commands for copy
            const commands = {
                wget: wgetCommand,
                curl: curlCommand,
                url: directUrl
            };
            
            // Add event listeners
            modalContent.querySelectorAll('.copy-cmd-btn').forEach(btn => {
                btn.addEventListener('mouseover', () => btn.style.boxShadow = '0 4px 20px rgba(255,255,255,0.3)');
                btn.addEventListener('mouseout', () => btn.style.boxShadow = 'none');
                btn.addEventListener('click', () => {
                    const cmdType = btn.getAttribute('data-cmd');
                    const text = commands[cmdType];
                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '✅ Copied!';
                        btn.style.background = 'rgba(34, 197, 94, 0.3)';
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.style.background = 'rgba(0, 0, 0, 0.8)';
                        }, 2000);
                    }).catch(err => {
                        console.error('Copy failed:', err);
                        alert('Không thể copy!');
                    });
                });
            });
            
            const closeBtn = modalContent.querySelector('.close-modal-btn');
            closeBtn.addEventListener('mouseover', () => closeBtn.style.boxShadow = '0 4px 20px rgba(255,255,255,0.3)');
            closeBtn.addEventListener('mouseout', () => closeBtn.style.boxShadow = 'none');
            closeBtn.addEventListener('click', () => modal.remove());
            
            modal.appendChild(modalContent);
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            document.body.appendChild(modal);
        } else {
            alert('Không thể lấy link tải!');
        }
    } catch (error) {
        console.error('Get wget link error:', error);
        alert('Lỗi khi lấy link tải!');
    }
}

// Toggle file menu dropdown
function toggleFileMenu(event, fileCode) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${fileCode}`);
    const allMenus = document.querySelectorAll('.file-dropdown-menu');
    
    // Close all other menus
    allMenus.forEach(m => {
        if (m.id !== `menu-${fileCode}`) {
            m.style.display = 'none';
        }
    });
    
    // Toggle current menu
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menus when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.file-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
});

// Delete user's file
async function deleteMyFile(fileCode) {
    if (!confirm('Bạn có chắc muốn xóa file này?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/file/${fileCode}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: currentUser.username })
        });

        const result = await response.json();

        if (result.success) {
            alert('Đã xóa file!');
            loadMyFiles(); // Reload list
        } else {
            alert(result.message || 'Xóa file thất bại!');
        }
    } catch (error) {
        console.error('Delete file error:', error);
        alert('Lỗi khi xóa file!');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Upload Functionality
function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = uploadArea.querySelector('.upload-btn');

    // Click to select files
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    selectedFiles = Array.from(files);
    displayFileList();
    
    if (selectedFiles.length > 0) {
        // Auto upload after selection
        setTimeout(() => {
            uploadFiles();
        }, 500);
    }
}

function displayFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
        return;
    }

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-icon">${getFileIcon(file.name)}</div>
                <div class="file-item-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="remove-file-btn" onclick="removeFile(${index})">Xóa</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFileList();
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'xls': '📊',
        'xlsx': '📊',
        'ppt': '📽️',
        'pptx': '📽️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'mp4': '🎬',
        'mp3': '🎵',
        'zip': '📦',
        'rar': '📦',
        'txt': '📃'
    };
    return icons[ext] || '📄';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function uploadFiles() {
    // Check if user is logged in
    if (!currentUser) {
        alert('Vui lòng đăng nhập để upload file!');
        showSection('signin');
        return;
    }

    if (selectedFiles.length === 0) {
        alert('Vui lòng chọn file để upload!');
        return;
    }

    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadResult = document.getElementById('uploadResult');
    const fileList = document.getElementById('fileList');

    // Show progress
    uploadProgress.classList.remove('hidden');
    fileList.classList.add('hidden');

    try {
        // Upload từng file (có thể cải thiện bằng cách upload nhiều file cùng lúc)
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            // Update progress text
            progressText.textContent = `Đang upload: ${file.name}...`;
            
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('username', currentUser.username); // Add username

            // Upload to server với progress tracking
            const xhr = new XMLHttpRequest();
            
            // Progress event
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = ((i + (e.loaded / e.total)) / selectedFiles.length) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = `Đang upload: ${Math.round(percentComplete)}%`;
                }
            });

            // Complete event
            await new Promise((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        
                        if (xhr.status === 200 && response.success) {
                            // Lưu file code để hiển thị sau
                            if (i === selectedFiles.length - 1) {
                                completeUpload(response.data);
                            }
                            resolve();
                        } else if (xhr.status === 503 && response.uploadLocked) {
                            // Upload locked error
                            reject(new Error(response.message || 'Upload is temporarily locked. Please wait for files to expire.'));
                        } else if (xhr.status === 507 && (response.storageFull || response.uploadLocked)) {
                            // Storage full error
                            reject(new Error(response.message || 'Storage is full! Upload has been blocked.'));
                        } else {
                            reject(new Error(response.message || `Upload failed (Status: ${xhr.status})`));
                        }
                    } catch (parseError) {
                        reject(new Error('Failed to parse server response'));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error'));
                });

                xhr.open('POST', `${API_URL}/upload`);
                xhr.send(formData);
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload thất bại: ' + error.message);
        resetUpload();
    }
}

function completeUpload(fileData) {
    // Show result
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadResult = document.getElementById('uploadResult');
    const shareLink = document.getElementById('shareLink');
    const resultInfo = document.querySelector('.result-info');

    uploadProgress.classList.add('hidden');
    uploadResult.classList.remove('hidden');

    // Tạo share URL với file code
    const shareUrl = `${window.location.origin}${window.location.pathname}?file=${fileData.code}`;
    shareLink.value = shareUrl;

    // Update expiry time text
    if (fileData.expiryTimeText) {
        resultInfo.textContent = `⚠️ File sẽ tự động bị xóa sau ${fileData.expiryTimeText} kể từ lúc upload`;
    }

    // Add copy animation
    setTimeout(() => {
        shareLink.select();
    }, 300);
}

// Không cần generateFileId nữa vì server sẽ tạo

function copyLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');

    // Show feedback
    const copyBtn = document.querySelector('.copy-btn span');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ Đã copy!';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
}

function resetUpload() {
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('fileList').classList.remove('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('uploadResult').classList.add('hidden');
    document.getElementById('progressFill').style.width = '0%';
}

// Download Functionality
function initializeDownload() {
    const downloadCode = document.getElementById('downloadCode');
    
    // Check URL for file parameter
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('file');
    
    if (fileId) {
        downloadCode.value = fileId;
        showSection('download');
        setTimeout(() => {
            downloadFile();
        }, 500);
    }

    // Enter key to download
    downloadCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadFile();
        }
    });
}

async function downloadFile() {
    const downloadCode = document.getElementById('downloadCode');
    const fileCode = extractFileId(downloadCode.value);
    
    if (!fileCode) {
        alert('Vui lòng nhập mã file hoặc link hợp lệ!');
        return;
    }

    try {
        // Gọi API để lấy thông tin file
        const response = await fetch(`${API_URL}/file/${fileCode}`);
        const result = await response.json();

        if (!result.success) {
            alert('Không tìm thấy file! Link có thể đã hết hạn hoặc không tồn tại.');
            return;
        }

        displayDownloadInfo(result.data);
    } catch (error) {
        console.error('Download error:', error);
        alert('Lỗi khi tải file: ' + error.message);
    }
}

function extractFileId(input) {
    // If it's a URL, extract the file parameter
    if (input.includes('?file=')) {
        const match = input.match(/\?file=([^&]+)/);
        return match ? match[1] : null;
    }
    // Otherwise, treat it as a direct file ID
    return input.trim();
}

function displayDownloadInfo(fileData) {
    const downloadInfo = document.getElementById('downloadInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const downloadBtn = downloadInfo.querySelector('.download-action-btn');

    // Display file info từ server
    fileName.textContent = fileData.originalName;
    fileSize.textContent = formatFileSize(fileData.size);

    downloadInfo.classList.remove('hidden');

    // Set download action - BẮT BUỘC ĐĂNG NHẬP
    downloadBtn.onclick = () => {
        if (!currentUser) {
            alert('Vui lòng đăng nhập để tải file!');
            showSection('signin');
            return;
        }
        initiateDownload(fileData);
    };
}

function initiateDownload(fileData) {
    // Tạo link download từ server
    const downloadUrl = `${API_URL}/download/${fileData.code}`;
    
    // Tạo thẻ <a> để trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileData.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success message
    const downloadBtn = document.querySelector('.download-action-btn span');
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = '✓ Đang tải xuống...';
    
    setTimeout(() => {
        downloadBtn.textContent = originalText;
    }, 3000);
}

// Không cần loadStoredFiles nữa vì dùng server
function loadStoredFiles() {
    // Server sẽ quản lý files
    console.log('Files are managed by server');
}

// Add some visual effects
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.glass-card');
    
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;
            
            card.style.transform = `perspective(1000px) rotateY(${deltaX * 5}deg) rotateX(${-deltaY * 5}deg)`;
        } else {
            card.style.transform = '';
        }
    });
});

// Add particle effect on button click
document.addEventListener('click', (e) => {
    if (e.target.closest('.liquid-glass-btn')) {
        createParticles(e.clientX, e.clientY);
    }
});

function createParticles(x, y) {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899'];
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.borderRadius = '50%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;
        
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / 6;
        const velocity = 2 + Math.random() * 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let posX = x;
        let posY = y;
        let opacity = 1;
        
        const animate = () => {
            posX += vx;
            posY += vy;
            opacity -= 0.02;
            
            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        animate();
    }
}

// ============================================
// STORAGE STATUS
// ============================================

let storageStatus = null;

async function loadStorageStatus() {
    try {
        const response = await fetch(`${API_URL}/storage/status`);
        const result = await response.json();

        if (result.success) {
            storageStatus = result.data;
            updateStorageUI();
            
            // Check if storage is full
            if (storageStatus.uploadBlocked) {
                showStorageFullModal();
                disableUpload();
            }
        }
    } catch (error) {
        console.error('Failed to load storage status:', error);
    }
}

function updateStorageUI() {
    if (!storageStatus) return;

    const storageText = document.getElementById('storageText');
    const storageProgressFill = document.getElementById('storageProgressFill');

    const { total } = storageStatus;
    const usedGB = total.used.toFixed(2);
    const limitGB = total.limit.toFixed(0);
    const percent = total.percent.toFixed(1);

    // Update text
    storageText.textContent = `${usedGB}GB / ${limitGB}GB (${percent}%)`;

    // Update progress bar
    storageProgressFill.style.width = `${Math.min(percent, 100)}%`;

    // Change color based on usage
    storageProgressFill.classList.remove('warning', 'critical');
    if (percent >= 95) {
        storageProgressFill.classList.add('critical');
    } else if (percent >= 80) {
        storageProgressFill.classList.add('warning');
    }
}

function showStorageFullModal() {
    const modal = document.getElementById('storageFullModal');
    modal.classList.remove('hidden');
}

function closeStorageFullModal() {
    const modal = document.getElementById('storageFullModal');
    modal.classList.add('hidden');
}

function disableUpload() {
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea) {
        uploadArea.style.pointerEvents = 'none';
        uploadArea.style.opacity = '0.5';
        uploadArea.innerHTML = `
            <div style="text-align: center;">
                <h3 style="color: #ef4444; margin-bottom: 1rem;">🚨 Upload Disabled</h3>
                <p>Storage is full. Please contact administrator.</p>
            </div>
        `;
    }
    
    if (fileInput) {
        fileInput.disabled = true;
    }
}

// Load storage status on page load
loadStorageStatus();

// Refresh storage status every 30 seconds
setInterval(loadStorageStatus, 30000);

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

async function loadProfile() {
    if (!currentUser) return;
    
    // For admin accounts, load from localStorage first
    if (currentUser.isAdmin) {
        document.getElementById('profileDisplayName').value = currentUser.displayName || currentUser.username;
        document.getElementById('avatarUrl').value = currentUser.avatar || '';
        
        // Update avatar preview
        const avatarPreview = document.getElementById('avatarPreview');
        if (currentUser.avatar) {
            if (currentUser.avatar.startsWith('http')) {
                avatarPreview.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarPreview.innerHTML = `<span style="font-size: 4rem;">${currentUser.avatar}</span>`;
            }
        } else {
            avatarPreview.innerHTML = '<span class="avatar-placeholder">👤</span>';
        }
        return;
    }
    
    // For regular users, load from API
    try {
        const response = await fetch(`${API_URL}/user/profile/${currentUser.username}`);
        const result = await response.json();
        
        if (result.success) {
            const profile = result.data;
            
            // Update currentUser with latest data
            currentUser.displayName = profile.displayName;
            currentUser.avatar = profile.avatar;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update form fields
            document.getElementById('profileDisplayName').value = profile.displayName || profile.username;
            document.getElementById('avatarUrl').value = profile.avatar || '';
            
            // Update avatar preview
            const avatarPreview = document.getElementById('avatarPreview');
            if (profile.avatar) {
                if (profile.avatar.startsWith('http')) {
                    avatarPreview.innerHTML = `<img src="${profile.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    avatarPreview.innerHTML = `<span style="font-size: 4rem;">${profile.avatar}</span>`;
                }
            } else {
                avatarPreview.innerHTML = '<span class="avatar-placeholder">👤</span>';
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

async function updateProfile() {
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    
    const displayName = document.getElementById('profileDisplayName').value.trim();
    const avatar = document.getElementById('avatarUrl').value.trim();
    
    if (!displayName) {
        alert('Vui lòng nhập tên hiển thị!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/user/profile/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: currentUser.username,
                displayName,
                avatar
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update current user
            currentUser.displayName = result.data.displayName;
            currentUser.avatar = result.data.avatar;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update UI
            updateAuthUI();
            loadProfile();
            
            alert('Cập nhật profile thành công!');
        } else {
            alert(result.message || 'Cập nhật thất bại!');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        alert('Lỗi khi cập nhật profile!');
    }
}

// Update avatar preview when URL changes
document.addEventListener('DOMContentLoaded', () => {
    const avatarUrlInput = document.getElementById('avatarUrl');
    if (avatarUrlInput) {
        avatarUrlInput.addEventListener('input', (e) => {
            const avatarPreview = document.getElementById('avatarPreview');
            const value = e.target.value.trim();
            
            if (value) {
                if (value.startsWith('http')) {
                    avatarPreview.innerHTML = `<img src="${value}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    avatarPreview.innerHTML = `<span style="font-size: 4rem;">${value}</span>`;
                }
            } else {
                avatarPreview.innerHTML = '<span class="avatar-placeholder">👤</span>';
            }
        });
    }
});
