
IF EXISTS (
    SELECT TOP 1 1 
    FROM SYSOBJECTS 
    WHERE ID = OBJECT_ID(N'[DBO].[W01P0002]') 
    AND OBJECTPROPERTY(ID, N'IsProcedure') = 1
)
DROP PROCEDURE W01P0002
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
----  các dữ liệu dropdown
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>
---- 
-- <History>
---- Create on 19/06/2026 by NgocDuy  dropdown
--EXEC W01P0002 @UserID = 'U003', @Mode = 'ROLE'
--EXEC W01P0002 @UserID = 'U003', @Mode = 'RANK'


CREATE PROCEDURE W01P0002
(
    @UserID VARCHAR(50),
    @Mode   VARCHAR(50)
)
AS
BEGIN

    DECLARE @UnitID VARCHAR(50)
    DECLARE @HierarchyPath VARCHAR(1000)

    -- Lấy thông tin user
    SELECT 
        @UnitID = UnitID
    FROM [User] WITH(NOLOCK)
    WHERE UserID = @UserID

    -- =========================
    -- MODE: ROLE
    -- =========================
    IF @Mode = 'ROLE'
    BEGIN
        SELECT RoleID, RoleName
        FROM Role WITH(NOLOCK)
        RETURN
    END

    -- =========================
    -- MODE: RANK
    -- =========================
    IF @Mode = 'RANK'
    BEGIN
        SELECT RankID, RankName
        FROM Rank WITH(NOLOCK)
        RETURN
    END

    -- =========================
    -- MODE: STATUS (SOLDIER)
    -- =========================
    IF @Mode = 'STATUS_SOLDIER'
    BEGIN
        SELECT StatusID, StatusName
        FROM Status WITH(NOLOCK)
        WHERE StatusType = 'SOLDIER'
        RETURN
    END

    -- =========================
    -- MODE: MARITAL STATUS
    -- =========================
    IF @Mode = 'MARITAL'
    BEGIN
        SELECT MaritalStatusID, MaritalStatusName
        FROM MaritalStatus WITH(NOLOCK)
        RETURN
    END

    -- =========================
    -- MODE: PROVINCE
    -- =========================
    IF @Mode = 'PROVINCE'
    BEGIN
        SELECT ProvinceID, ProvinceName
        FROM Province WITH(NOLOCK)
        RETURN
    END

    -- =========================
    -- MODE: WARD BY PROVINCE
    -- =========================
    IF @Mode = 'WARD'
    BEGIN
        SELECT WardID, WardName, ProvinceID
        FROM Ward WITH(NOLOCK)
        RETURN
    END

    -- =========================
    -- MODE: ORGANIZATION UNIT TREE (QUAN TRỌNG NHẤT)
    -- =========================
    IF @Mode = 'ORG_UNIT'
    BEGIN

        SELECT @HierarchyPath = HierarchyPath
        FROM OrganizationUnit WITH(NOLOCK)
        WHERE UnitID = @UnitID

        -- ADMIN xem tất cả
        IF EXISTS (SELECT 1 FROM [User] WHERE UserID = @UserID AND RoleID = 'R001')
        BEGIN
            SELECT UnitID, UnitName, ParentUnitID, HierarchyPath, UnitLevel
            FROM OrganizationUnit WITH(NOLOCK)
            ORDER BY HierarchyPath
            RETURN
        END

        -- User thường: chỉ xem từ unit của mình trở xuống
        SELECT 
            UnitID,
            UnitName,
            ParentUnitID,
            HierarchyPath,
            FullPathName,
            UnitLevel
        FROM OrganizationUnit WITH(NOLOCK)
        WHERE HierarchyPath LIKE @HierarchyPath + '%'
        ORDER BY HierarchyPath

        RETURN
    END

END
GO

